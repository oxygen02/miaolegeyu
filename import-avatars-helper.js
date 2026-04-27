// 头像导入辅助脚本
// 使用说明：
// 1. 先在云存储上传所有图片
// 2. 复制所有文件的 cloud:// 链接
// 3. 修改下面的 avatarData 数组
// 4. 在云开发控制台 → 数据库 → avatars → 导入

// 示例数据格式（你需要根据实际文件名修改）
const avatarData = [
  {
    category: "cat",
    name: "猫咪1号",
    imageUrl: "cloud://你的环境ID/avatars/cat/xxx.jpg",
    usageCount: 0
  },
  // ... 175条数据
];

// 如果你已经有JSON文件，可以直接使用：
// 在云开发控制台 → 数据库 → avatars → 导入 → 选择JSON文件

// JSON文件格式示例：
/*
{
  "data": [
    {
      "category": "cat",
      "name": "猫咪1号",
      "imageUrl": "cloud://xxx.jpg",
      "usageCount": 0
    }
  ]
}
*/

console.log('请根据你的实际文件修改 avatarData 数组');
console.log('或者直接在云开发控制台导入JSON文件');
