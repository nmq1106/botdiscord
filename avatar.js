// Tải cấu hình từ file .env lên đầu tiên để bảo mật token
require('dotenv').config(); 
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

// Định nghĩa tiền tố lệnh (Dễ dàng thay đổi thành '!', '?', v.v.)
const PREFIX = '!';

// Khởi tạo client với các Intents bắt buộc
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent 
    ]
});

// Sự kiện kích hoạt khi bot trực tuyến thành công
client.once('ready', () => {
    console.log(`✅ Bot đã sẵn sàng hoạt động với tên: ${client.user.tag}`);
});

// Sự kiện xử lý khi có tin nhắn mới trong server
client.on('messageCreate', async message => {
    // Bỏ qua nếu tin nhắn từ bot khác hoặc không bắt đầu bằng PREFIX đã đặt
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    // Tách chuỗi tin nhắn thành tên lệnh và các tham số (args) đi kèm
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // LỆNH: !avatar
    if (command === 'avatar') {
        let targetUser;

        try {
            if (message.mentions.users.first()) {
                // Trường hợp 1: Người dùng được tag trực tiếp (Thành viên trong server)
                targetUser = message.mentions.users.first();
            } else if (args[0]) {
                // Trường hợp 2: Người dùng nhập bằng ID (Hoạt động với cả người KHÔNG có trong server)
                // Sử dụng await để ép bot tìm kiếm trực tiếp trên cơ sở dữ liệu toàn hệ thống của Discord
                targetUser = await client.users.fetch(args[0]);
            } else {
                // Trường hợp 3: Người dùng chỉ gõ "!avatar" mà không tag/nhập ID -> Lấy chính họ
                targetUser = message.author;
            }
        } catch (error) {
            // Xử lý khi ID nhập vào bị sai cấu trúc, không tồn tại hoặc lỗi kết nối API
            return message.reply('❌ Không thể tìm thấy người dùng này. Vui lòng kiểm tra chính xác lại ID!');
        }

        // Lấy link ảnh đại diện gốc với chất lượng cao tối đa (Size: 2048)
        const avatarURL = targetUser.displayAvatarURL({ 
            extension: 'png', 
            forceStatic: false, // Giữ hiệu ứng ảnh động nếu là avatar dạng GIF
            size: 2048 
        });

        // Xây dựng khung hiển thị (Embed) chuyên nghiệp
        const avatarEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(` Ảnh đại diện của ${targetUser.username}`)
            .setDescription(`[📥 Nhấp vào đây để tải ảnh gốc chất lượng cao](${avatarURL})`)
            .setImage(avatarURL)
            .setFooter({ 
                text: `Yêu cầu bởi ${message.author.username}`, 
                iconURL: message.author.displayAvatarURL() 
            });

        // Gửi phản hồi lại cho người dùng
        return message.reply({ embeds: [avatarEmbed] });
    }
});

// Đăng nhập vào hệ thống Discord bằng Token được lưu an toàn trong file .env
client.login(process.env.BOT_TOKEN);