// data.js - Dữ liệu mẫu ban đầu và trình giả lập giao dịch

const initialTransactions = [
    {
        id: "TX982731",
        sender: "Nguyễn Văn Anh",
        amount: 500000,
        time: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 phút trước
        message: "Ủng hộ dự án phát triển cộng đồng trẻ em vùng cao",
        project: "Vùng Cao Yêu Thương"
    },
    {
        id: "TX982730",
        sender: "Trần Thị Mai",
        amount: 1000000,
        time: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 phút trước
        message: "Chúc dự án thành công tốt đẹp!",
        project: "Vùng Cao Yêu Thương"
    },
    {
        id: "TX982729",
        sender: "Ẩn danh",
        amount: 200000,
        time: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        message: "Một chút tấm lòng gửi tới các em nhỏ",
        project: "Vùng Cao Yêu Thương"
    },
    {
        id: "TX982728",
        sender: "Lê Hoàng Nam",
        amount: 50000,
        time: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        message: "Hoàng Nam ủng hộ quỹ",
        project: "Vùng Cao Yêu Thương"
    },
    {
        id: "TX982727",
        sender: "Phạm Minh Đức",
        amount: 2000000,
        time: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 giờ trước
        message: "Ủng hộ từ tập thể lớp 12A1 K60",
        project: "Vùng Cao Yêu Thương"
    },
    {
        id: "TX982726",
        sender: "Hoàng Lê Vy",
        amount: 150000,
        time: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        message: "Góp gió thành bão",
        project: "Vùng Cao Yêu Thương"
    },
    {
        id: "TX982725",
        sender: "Ngô Quốc Khánh",
        amount: 300000,
        time: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
        message: "Khánh chuyển khoản ủng hộ",
        project: "Vùng Cao Yêu Thương"
    }
];

const names = [
    "Phan Thanh Bình", "Đỗ Mỹ Linh", "Vũ Huy Hoàng", "Bùi Thị Tuyết", "Dương Quốc Bảo",
    "Lý Kim Dung", "Tống Văn Đạt", "Trịnh Hoài Nam", "Đặng Thu Thảo", "Lâm Minh Hằng",
    "Võ Thành Trung", "Đoàn Ngọc Ánh", "Mai Tiến Dũng", "Phùng Gia Bảo", "Hồ Xuân Hương"
];

const messages = [
    "Gửi chút yêu thương đến dự án",
    "Đồng hành cùng mọi người",
    "Hy vọng dự án lan tỏa nhiều hơn",
    "Ủng hộ quỹ phát triển cộng đồng",
    "Cố lên các bạn ơi!",
    "Ủng hộ từ nhóm bạn trẻ Hà Nội",
    "Góp một phần nhỏ bé giúp đỡ",
    "Lan tỏa yêu thương",
    "Chúc dự án sớm đạt mục tiêu đề ra"
];

const amounts = [50000, 100000, 200000, 500000, 1000000, 1500000, 2000000, 5000000];

function generateRandomTransaction() {
    const isAnonymous = Math.random() < 0.2;
    const randomSender = isAnonymous ? "Ẩn danh" : names[Math.floor(Math.random() * names.length)];
    const randomAmount = amounts[Math.floor(Math.random() * amounts.length)];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    const id = "TX" + Math.floor(100000 + Math.random() * 900000);

    return {
        id: id,
        sender: randomSender,
        amount: randomAmount,
        time: new Date().toISOString(),
        message: randomMessage,
        project: "Vùng Cao Yêu Thương"
    };
}
