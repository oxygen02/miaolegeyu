const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { 
    nickName, 
    avatarUrl,
    isCustom = false, // 是否为自定义登录（非微信登录）
    action = 'login', // login | syncFriends | reverseGeocode
    latitude,
    longitude
  } = event;
  
  try {
    // 获取微信上下文
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    if (!openid && !isCustom) {
      return {
        code: -1,
        msg: '获取用户身份失败'
      };
    }
    
  // 根据 action 执行不同操作
  switch (action) {
    case 'syncFriends':
      return await syncFriends(openid, event);
    case 'reverseGeocode':
      return await reverseGeocode(latitude, longitude, openid);
    case 'syncCity':
      return await syncCity(openid, event.city);
    case 'login':
    default:
      return await handleLogin(openid, nickName, avatarUrl, isCustom, latitude, longitude);
  }
  } catch (err) {
    console.error('userLogin error:', err);
    return {
      code: -1,
      msg: err.message || '操作失败'
    };
  }
};

// 处理登录
async function handleLogin(openid, nickName, avatarUrl, isCustom, latitude, longitude) {
  // 生成用户ID
  const userId = openid || generateUserId();
  
  // 查询用户是否已存在
  const { data: existingUsers } = await db.collection('users')
    .where({
      _openid: openid || db.command.eq(null)
    })
    .limit(1)
    .get();
  
  let userInfo;
  
  if (existingUsers && existingUsers.length > 0) {
    // 用户已存在，更新信息
    userInfo = existingUsers[0];
    
    // 如果是微信登录且提供了新信息，则更新
    if (!isCustom && (nickName || avatarUrl)) {
      const updateData = {};
      if (nickName) updateData.nickName = nickName;
      if (avatarUrl) updateData.avatarUrl = avatarUrl;
      updateData.lastLoginTime = db.serverDate();
      
      await db.collection('users').doc(userInfo._id).update({
        data: updateData
      });
      
      userInfo = { ...userInfo, ...updateData };
    }

    // 自动同步城市信息（如果前端传了坐标）
    if (latitude && longitude) {
      try {
        const cityResult = await reverseGeocode(latitude, longitude, openid);
        if (cityResult.success) {
          console.log('登录时自动同步城市成功:', cityResult.city);
          userInfo.userCity = cityResult;
        }
      } catch (cityErr) {
        console.error('登录时自动同步城市失败:', cityErr);
        // 城市同步失败不影响登录流程
      }
    }
  } else {
    // 新用户，创建记录（包含状态管理字段）
    const newUser = {
      _openid: openid || null,
      userId: userId,
      nickName: nickName || '喵了个鱼用户',
      avatarUrl: avatarUrl || '',
      isCustomLogin: isCustom,
      // 用户状态管理字段
      status: 'normal',           // normal | banned | muted
      banReason: '',              // 封禁原因
      banUntil: null,             // 封禁到期时间
      bannedAt: null,             // 封禁时间
      bannedBy: '',               // 封禁操作人openid
      muteReason: '',             // 禁言原因
      muteUntil: null,            // 禁言到期时间
      mutedAt: null,              // 禁言时间
      mutedBy: '',                // 禁言操作人openid
      violationCount: 0,          // 违规次数
      // 隐私设置字段
      friendOpenids: [],          // 好友openid列表
      userCity: null,             // 用户所在城市
      privacySettings: {
        allowFriendFind: true,    // 允许好友找到我
        allowLocation: false,     // 允许获取位置
        defaultVisibility: 'friends' // 默认活动可见性
      },
      createTime: db.serverDate(),
      lastLoginTime: db.serverDate()
    };
    
    const result = await db.collection('users').add({
      data: newUser
    });
    
    userInfo = {
      _id: result._id,
      ...newUser
    };

    // 新用户如果有坐标，直接设置城市
    if (latitude && longitude) {
      try {
        const cityResult = await reverseGeocode(latitude, longitude, openid);
        if (cityResult.success) {
          console.log('新用户注册时设置城市成功:', cityResult.city);
          userInfo.userCity = cityResult;
        }
      } catch (cityErr) {
        console.error('新用户设置城市失败:', cityErr);
      }
    }
  }
  
  return {
    code: 0,
    msg: '登录成功',
    data: {
      userId: userInfo.userId,
      nickName: userInfo.nickName,
      avatarUrl: userInfo.avatarUrl,
      isCustomLogin: userInfo.isCustomLogin,
      privacySettings: userInfo.privacySettings,
      userCity: userInfo.userCity,  // 返回当前城市信息给前端
      needCitySetup: !userInfo.userCity  // 提示前端是否需要设置城市
    }
  };
}

// 同步好友关系
// 注意：微信小程序无法直接获取用户的微信通讯录好友
// 同玩好友需要通过客户端 wx.getFriendCloudStorage 获取后传入
async function syncFriends(openid, event) {
  try {
    // 1. 从客户端传入的同玩好友 openid 列表
    const gameFriends = event.gameFriends || [];
    console.log('客户端传入同玩好友数:', gameFriends.length);

    // 2. 获取用户当前的分享链好友（通过分享链接建立的关系）
    let shareChainFriends = [];
    try {
      const { data: shareChains } = await db.collection('shareChains')
        .where({
          targetOpenid: openid,
          expireTime: _.gt(db.serverDate())
        })
        .get();
      shareChainFriends = shareChains.map(chain => chain.sourceOpenid);
    } catch (err) {
      console.log('获取分享链好友失败:', err);
    }

    // 3. 合并所有好友（去重）
    const allFriends = [...new Set([...gameFriends, ...shareChainFriends])];

    // 4. 更新用户好友列表
    await db.collection('users').where({
      _openid: openid
    }).update({
      data: {
        friendOpenids: allFriends,
        lastFriendSyncTime: db.serverDate()
      }
    });

    return {
      success: true,
      friendOpenids: allFriends,
      gameFriendsCount: gameFriends.length,
      shareChainCount: shareChainFriends.length
    };
  } catch (err) {
    console.error('同步好友失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

// 逆地理编码（坐标转地址）并保存到用户记录
async function reverseGeocode(latitude, longitude, openid) {
  try {
    // 调用腾讯地图API进行逆地理编码
    const config = await db.collection('config').doc('tencentMap').get().catch(() => ({ data: null }));
    const key = config.data?.key || 'YOUR_TENCENT_MAP_KEY';
    
    const url = `https://apis.map.qq.com/ws/geocoder/v1/?location=${latitude},${longitude}&key=${key}&get_poi=0`;
    
    const res = await cloud.openapi({
      method: 'GET',
      url: url
    });
    
    if (res.status === 0 && res.result) {
      const address = res.result.address_component;
      const adcode = res.result.ad_info.adcode;
      
      // 判断国内/海外
      const isDomestic = !res.result.address_component.country || 
                         res.result.address_component.country === '中国';
      
      const cityData = {
        country: address.country || '中国',
        countryCode: isDomestic ? 'CN' : getCountryCode(address.country),
        region: address.province || '',
        city: address.city || address.province, // 直辖市用省名
        cityCode: adcode ? adcode.substring(0, 4) + '00' : '',
        district: address.district || '',
        isDomestic: isDomestic,
        address: res.result.address
      };

      // 如果提供了 openid，则保存城市信息到用户记录
      if (openid) {
        try {
          await db.collection('users').where({ _openid: openid }).update({
            data: {
              userCity: cityData,
              lastLoginTime: db.serverDate()
            }
          });
          console.log('用户城市信息已更新:', openid, cityData.city);
        } catch (updateErr) {
          console.error('保存城市信息失败:', updateErr);
          // 保存失败不影响返回结果
        }
      }

      return {
        success: true,
        ...cityData
      };
    } else {
      throw new Error(res.message || '逆地理编码失败');
    }
  } catch (err) {
    console.error('逆地理编码失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

// 同步城市信息到用户记录
async function syncCity(openid, cityData) {
  try {
    if (!openid || !cityData) {
      return { success: false, error: '参数缺失' };
    }

    await db.collection('users').where({ _openid: openid }).update({
      data: {
        userCity: cityData,
        lastLoginTime: db.serverDate()
      }
    });

    console.log('用户城市信息已同步:', openid, cityData.city);
    return { success: true };
  } catch (err) {
    console.error('同步城市信息失败:', err);
    return { success: false, error: err.message };
  }
}

// 生成独立用户ID（自定义登录时使用）
function generateUserId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 4);
  return `user_${timestamp}${random}`;
}

// 获取国家代码（简化版）
function getCountryCode(countryName) {
  const countryMap = {
    '美国': 'US',
    '日本': 'JP',
    '韩国': 'KR',
    '新加坡': 'SG',
    '泰国': 'TH',
    '马来西亚': 'MY',
    '澳大利亚': 'AU',
    '英国': 'UK',
    '法国': 'FR',
    '德国': 'DE',
    '加拿大': 'CA',
    '新西兰': 'NZ'
  };
  return countryMap[countryName] || 'OTHER';
}