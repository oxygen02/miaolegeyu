const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 预加载腾讯云SDK（避免运行时加载导致超时）
let tencentcloud = null;
let OcrClient = null;

try {
  tencentcloud = require("tencentcloud-sdk-nodejs");
  OcrClient = tencentcloud.ocr.v20181119.Client;
  console.log('✅ 腾讯云SDK预加载成功');
} catch (e) {
  console.log('⚠️ 腾讯云SDK未安装或加载失败');
}

exports.main = async (event, context) => {
  const startTime = Date.now();
  const { imageBase64 } = event;

  if (!imageBase64) {
    return { code: -1, error: '缺少图片数据', method: 'none' };
  }

  console.log('=== 开始AI识别 ===');
  console.log('图片数据长度:', imageBase64.length);
  console.log('时间戳:', new Date().toISOString());

  let cleanBase64 = imageBase64;
  if (cleanBase64.includes(',')) {
    cleanBase64 = cleanBase64.split(',')[1];
  }

  if (!cleanBase64 || cleanBase64.length < 100) {
    return { code: -1, error: '无效的图片数据', method: 'none' };
  }

  try {
    // ========== 第1层：微信内置OCR ✨ ==========
    console.log('\n[1/2] 尝试微信OCR...', `(${Date.now() - startTime}ms)`);
    
    let wechatError = null;
    try {
      const result = await Promise.race([
        cloud.openapi.ocr.printedText({
          img: {
            type: 'image',
            contentType: 'image/jpeg',
            value: Buffer.from(cleanBase64, 'base64')
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('微信OCR调用超时')), 12000)
        )
      ]);

      console.log(`[✅] 微信OCR完成 (${Date.now() - startTime}ms)`);

      if (result && result.items && Array.isArray(result.items) && result.items.length > 0) {
        const textList = result.items
          .map(item => item.text)
          .filter(text => text && typeof text === 'string' && text.trim().length > 0)
          .map(text => text.trim());
        
        if (textList.length > 0) {
          console.log(`✅ 成功！识别${textList.length}项，总耗时${Date.now() - startTime}ms`);
          
          return {
            code: 0,
            data: textList,
            fullText: textList.join('\n'),
            method: 'wechat-ocr',
            itemCount: textList.length,
            totalTime: Date.now() - startTime,
            message: `微信OCR成功（${textList.length}项）`
          };
        }
      }

      console.log('⚠️ 微信OCR返回空结果');
      
    } catch (wxErr) {
      wechatError = wxErr;
      console.error(`❌ 微信OCR失败 (${Date.now() - startTime}ms):`, wxErr.message?.substring(0, 100));
    }

    // ========== 第2层：腾讯云OCR 🔄 ==========
    console.log(`\n[2/2] 尝试腾讯云OCR... (${Date.now() - startTime}ms)`);
    
    const secretId = process.env.TENCENT_SECRET_ID || 'AKIDjP4JQM5dFq8LSUP9kDWeaN1VO5bx43sV';
    const secretKey = process.env.TENCENT_SECRET_KEY || 'Ur4SgssfGfx63tZ4NI9vX8fLvMp7E87x';

    if (OcrClient && secretId && secretKey) {
      try {
        const client = new OcrClient({
          credential: { secretId, secretKey },
          region: "ap-guangzhou",
          profile: {
            httpProfile: { 
              endpoint: "ocr.tencentcloudapi.com",
              timeout: 10 // 10秒超时
            }
          }
        });

        console.log('📞 调用腾讯云API...');
        
        const ocrResult = await client.GeneralBasicOCR({
          ImageBase64: cleanBase64
        });

        console.log(`[✅] 腾讯云OCR完成 (${Date.now() - startTime}ms)`);

        if (ocrResult && ocrResult.TextDetections && ocrResult.TextDetections.length > 0) {
          const textList = ocrResult.TextDetections.map(item => item.DetectedText);
          console.log(`✅ 成功！识别${textList.length}项，总耗时${Date.now() - startTime}ms`);
          
          return {
            code: 0,
            data: textList,
            fullText: textList.join('\n'),
            method: 'tencent-ocr',
            itemCount: textList.length,
            totalTime: Date.now() - startTime,
            message: `腾讯云OCR成功（${textList.length}项）`
          };
        }

        console.log('⚠️ 腾讯云OCR返回空结果');

      } catch (tencentErr) {
        console.error(`❌ 腾讯云OCR失败 (${Date.now() - startTime}ms):`, tencentErr.message?.substring(0, 100));
      }
    } else {
      console.log('⚠️ 跳过腾讯云OCR（SDK未加载或缺少密钥）');
    }

    // ========== 返回错误信息 ==========
    let errorMessage = 'OCR服务暂时不可用';
    let errorDetail = '所有方案均失败';

    if (wechatError) {
      if (wechatError.message?.includes('not enough market quota')) {
        errorMessage = '微信OCR配额已用完';
        errorDetail = '腾讯云OCR也未能成功';
      } else if (wechatError.message?.includes('超时')) {
        errorMessage = '服务响应超时';
        errorDetail = '请检查网络后重试';
      } else {
        errorDetail = wechatError.message?.substring(0, 50) || '未知错误';
      }
    }

    console.error(`❌ 全部失败 (${Date.now() - startTime}ms):`, errorMessage);

    return {
      code: -1,
      error: errorMessage,
      detail: errorDetail,
      method: 'all-failed',
      isQuotaExceeded: errorMessage.includes('配额'),
      totalTime: Date.now() - startTime,
      message: `${errorMessage}：${errorDetail}`
    };

  } catch (err) {
    console.error('❌ 严重错误:', err);
    return {
      code: -1,
      error: err.message || '系统异常',
      method: 'error',
      totalTime: Date.now() - startTime,
      message: '识别异常：' + (err.message || '未知错误')
    };
  }
};