// app.js - Logic điều khiển giao diện, bộ lọc, nạp dữ liệu từ Google Sheets & vẽ biểu đồ

// Cấu hình URL Google Sheets CSV của bạn
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQG7tz_z9LIypAWURURUblXldS73-FiMwOzQbNqmGt_8ktRqPn0ftHSPRAAiZjBgB8zSpp4_u32fOES/pub?output=csv";

// CẤU HÌNH TÀI KHOẢN NHẬN TIỀN CỦA BẠN (DÙNG ĐỂ TẠO VIETQR ĐỘNG)
const RECEIVER_BANK_ID = "MB"; // Ví dụ: MB, VCB, ACB, TCB, VPB...
const RECEIVER_ACCOUNT_NO = "3055999999999"; // Số tài khoản nhận tiền
const RECEIVER_ACCOUNT_NAME = "VUNG CAO YEU THUONG"; // Tên chủ tài khoản viết hoa không dấu
const DONATION_GOAL = 3000000; // Mục tiêu quyên góp (3.000.000đ)

// Danh sách giao dịch toàn cục (ban đầu lấy từ dữ liệu mẫu, sau đó ghi đè từ Google Sheets)
let transactions = [];
let googleSheetTransactions = []; // Lưu trữ giao dịch gốc từ Google Sheets
let currentSortOrder = "desc"; // desc = mới nhất, asc = cũ nhất
let simulationInterval = null;
let pollingInterval = null;
let chartInstance = null;

// Hàm định dạng tiền tệ VND
function formatVND(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Loại bỏ dấu tiếng Việt để tìm kiếm chính xác
function removeVietnameseTones(str) {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|B|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    str = str.replace(/[^a-zA-Z0-9\s]/g, "");
    return str.toLowerCase().trim();
}

// Tính toán thời gian tương đối
function timeAgo(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0 || diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return `${diffDays} ngày trước`;
}

// Tạo chữ viết tắt đại diện cho Avatar
function getAvatarPlaceholder(name) {
    if (name.includes("Ẩn danh")) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
        return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
}

// Hàm trích xuất tên người gửi từ nội dung chuyển tiền
function extractSenderName(note) {
    if (!note) return "Người ẩn danh";
    
    // Đưa về viết hoa để đồng bộ xử lý
    let cleanNote = note.toUpperCase();
    
    // Loại bỏ các từ khóa giao dịch phổ biến của ngân hàng/sepay
    const keywordsToRemove = [
        "CHUYEN KHOAN", "CHUYEN TIEN", "CHUYENKHOAN", "CHUYENTIEN",
        "THANH TOAN", "THANHTOAN", "QUYEN GOP", "QUYENGOP",
        "UNG HO", "UNGHO", "GOP QUY", "GOPQUY", "TIEP NHAN", "TIEPNHAN",
        "MOMO", "ZALOPAY", "VIETQR", "SEPAY", "IBFT", "FAST", "NAPAS",
        "CK ", "CT ", "GD ", "ND ", "TK ", "STK ", "MC "
    ];
    
    keywordsToRemove.forEach(kw => {
        cleanNote = cleanNote.split(kw).join(" ");
    });
    
    // Tìm chuỗi các từ viết hoa liên tiếp có độ dài từ 2 từ trở lên đại diện cho tên (ví dụ: NGUYEN VAN A)
    const matches = cleanNote.match(/\b[A-Z]{2,}\b(\s+\b[A-Z]{2,}\b){1,3}/g);
    
    if (matches && matches.length > 0) {
        let name = matches[0].trim();
        // Loại bỏ nếu tên chỉ chứa các từ viết tắt tên ngân hàng phổ biến
        const bankCodes = ["VCB", "MBB", "ACB", "TCB", "BIDV", "CTG", "AGR", "VPB", "TPB", "MSB", "SHB", "HDB", "VIB", "LPB", "MBBANK"];
        if (bankCodes.includes(name)) {
            return "Người ẩn danh";
        }
        return name;
    }
    
    return "Người ẩn danh";
}

// 解析 CSV (Parse CSV)
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    if (lines.length <= 1) return [];
    
    // Header: Ngân hàng,Ngày giao dịch,Số tài khoản,Tài khoản phụ,Code TT,Nội dung thanh toán,Loại,Số tiền,Mã tham chiếu,Lũy kế
    const parsedTransactions = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Phân tách dấu phẩy tránh bị lỗi nếu nội dung chuyển tiền chứa dấu phẩy
        const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(col => {
            let val = col.trim();
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.substring(1, val.length - 1);
            }
            return val;
        });
        
        if (columns.length < 9) continue;
        
        const bankName = columns[0] || "NH";
        const dateStr = columns[1] || "";
        const note = columns[5] || "";
        const amountStr = columns[7] || "0";
        const refCode = columns[8] || ("TX" + Math.floor(Math.random() * 100000));
        
        const amount = parseFloat(amountStr.replace(/[^0-9.-]+/g, "")) || 0;
        
        // Chuyển đổi định dạng ngày "YYYY-MM-DD HH:mm:ss"
        let dateObj = new Date(dateStr.replace(/-/g, "/"));
        if (isNaN(dateObj.getTime())) {
            dateObj = new Date();
        }
        
        // Xác định tên người gửi thông qua hàm trích xuất thông minh
        const sender = extractSenderName(note);
        
        parsedTransactions.push({
            id: refCode,
            sender: sender,
            amount: amount,
            time: dateObj.toISOString(),
            message: note || `Chuyển khoản qua ngân hàng ${bankName}`,
            project: "Vùng Cao Yêu Thương"
        });
    }
    return parsedTransactions;
}

// ----------------------------------------------------
// TẢI DỮ LIỆU TỪ GOOGLE SHEETS
// ----------------------------------------------------
async function fetchGoogleSheetsData() {
    const statusText = document.querySelector(".status-text");
    try {
        const response = await fetch(GOOGLE_SHEET_CSV_URL + "&t=" + new Date().getTime()); // Tránh cache
        if (!response.ok) throw new Error("Không thể tải tệp Google Sheets");
        
        const csvText = await response.text();
        const sheetTxs = parseCSV(csvText);
        
        googleSheetTransactions = sheetTxs;
        
        transactions = [...googleSheetTransactions];
        
        updateStats();
        renderTransactions();
        updateChart();
        updateLeaderboard();
        
        if (statusText) statusText.innerText = "Live";
    } catch (error) {
        console.error("Lỗi đồng bộ dữ liệu:", error);
        if (statusText) statusText.innerText = "Lỗi đồng bộ (Xem Console)";
        
        // Không dùng dữ liệu mẫu khi lỗi, giữ danh sách trống
        if (transactions.length === 0) {
            updateStats();
            renderTransactions();
            updateChart();
            updateLeaderboard();
        }
    }
}

// ----------------------------------------------------
// CẬP NHẬT STATS (BẢNG THỐNG KÊ)
// ----------------------------------------------------
function updateStats() {
    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const totalCount = transactions.length;
    const avgAmount = totalCount > 0 ? Math.round(totalAmount / totalCount) : 0;
    
    let lastTxText = "Chưa có";
    if (totalCount > 0) {
        const sortedByTime = [...transactions].sort((a, b) => new Date(b.time) - new Date(a.time));
        lastTxText = timeAgo(sortedByTime[0].time);
    }

    document.getElementById("total-amount").innerText = formatVND(totalAmount);
    document.getElementById("total-count").innerText = totalCount.toLocaleString();
    document.getElementById("avg-amount").innerText = formatVND(avgAmount);
    document.getElementById("last-time").innerText = lastTxText;

    // Cập nhật thanh tiến trình mục tiêu
    const progressPercent = Math.min(100, Math.round((totalAmount / DONATION_GOAL) * 100)) || 0;
    const progressBar = document.getElementById("goal-progress-bar");
    if (progressBar) {
        progressBar.style.width = progressPercent + "%";
    }
    const goalPercentEl = document.getElementById("goal-percent");
    if (goalPercentEl) {
        goalPercentEl.innerText = progressPercent + "%";
    }
    const goalCurrentEl = document.getElementById("goal-current");
    if (goalCurrentEl) {
        goalCurrentEl.innerText = `Đã đạt: ${formatVND(totalAmount)}`;
    }
}

// ----------------------------------------------------
// HIỂN THỊ DANH SÁCH GIAO DỊCH
// ----------------------------------------------------
function renderTransactions() {
    const searchInput = document.getElementById("search-input").value;
    const cleanSearchQuery = removeVietnameseTones(searchInput);
    const container = document.getElementById("transactions-list");
    const emptyState = document.getElementById("empty-state");
    const visibleCountBadge = document.getElementById("visible-count");

    let filtered = transactions.filter(tx => {
        const cleanSender = removeVietnameseTones(tx.sender);
        const cleanMsg = removeVietnameseTones(tx.message);
        const cleanId = tx.id.toLowerCase();
        const matchesSearch = cleanSender.includes(cleanSearchQuery) || 
                              cleanMsg.includes(cleanSearchQuery) || 
                              cleanId.includes(cleanSearchQuery) ||
                              tx.amount.toString().includes(cleanSearchQuery);

        return matchesSearch;
    });

    filtered.sort((a, b) => {
        const dateA = new Date(a.time);
        const dateB = new Date(b.time);
        return currentSortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    visibleCountBadge.innerText = `${filtered.length} giao dịch`;
    container.innerHTML = "";

    if (filtered.length === 0) {
        emptyState.style.display = "block";
        return;
    }

    emptyState.style.display = "none";

    filtered.forEach(tx => {
        const card = document.createElement("div");
        card.className = "tx-card";
        
        card.innerHTML = `
            <div class="tx-left">
                <div class="tx-info">
                    <span class="tx-sender">${tx.sender}</span>
                    <span class="tx-message">${tx.message}</span>
                    <div class="tx-meta">
                        <span class="tx-id">#${tx.id}</span>
                        <span>&bull;</span>
                        <span>Dự án: ${tx.project}</span>
                    </div>
                </div>
            </div>
            <div class="tx-right">
                <span class="tx-amount">+${formatVND(tx.amount)}</span>
                <span class="tx-time" data-time="${tx.time}">${timeAgo(tx.time)}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

// ----------------------------------------------------
// CẬP NHẬT BIỂU ĐỒ (CHART)
// ----------------------------------------------------
function updateChart() {
    const sortedTimeline = [...transactions].sort((a, b) => new Date(a.time) - new Date(b.time));
    
    let cumulativeSum = 0;
    const chartData = sortedTimeline.map(tx => {
        cumulativeSum += tx.amount;
        return {
            x: new Date(tx.time),
            y: cumulativeSum
        };
    });

    const finalData = chartData.slice(-15);
    const labels = finalData.map(d => {
        const t = d.x;
        return `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}:${t.getSeconds().toString().padStart(2, '0')}`;
    });
    const values = finalData.map(d => d.y);

    if (chartInstance) {
        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = values;
        chartInstance.update();
    } else {
        const ctx = document.getElementById('donationChart').getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tổng quỹ lũy kế (VND)',
                    data: values,
                    borderColor: '#6366f1',
                    borderWidth: 3,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#ec4899',
                    pointBorderColor: '#fff',
                    pointHoverRadius: 6,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#9ca3af', font: { family: 'Be Vietnam Pro' } }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#9ca3af', font: { family: 'Be Vietnam Pro' },
                            callback: function(value) {
                                if (value >= 1000000) return (value / 1000000) + ' Trđ';
                                if (value >= 1000) return (value / 1000) + ' Kđ';
                                return value;
                            }
                        }
                    }
                }
            }
        });
    }
}

// ----------------------------------------------------
// ĐỒNG BỘ DỮ LIỆU TỰ ĐỘNG (POLLING)
// ----------------------------------------------------
function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    // Tự động tải lại Google Sheets mỗi 12 giây
    pollingInterval = setInterval(fetchGoogleSheetsData, 12000);
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

// ----------------------------------------------------
// KHỞI TẠO ỨNG DỤNG
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Tải dữ liệu ban đầu từ Google Sheets
    await fetchGoogleSheetsData();
    startPolling();
    
    // Tự động cập nhật thời gian hiển thị mỗi 30 giây
    setInterval(() => {
        document.querySelectorAll(".tx-time").forEach(el => {
            const dateStr = el.getAttribute("data-time");
            if (dateStr) el.innerText = timeAgo(dateStr);
        });
        updateStats();
    }, 30000);

    // 2. Lắng nghe thanh tìm kiếm
    const searchInput = document.getElementById("search-input");
    const clearSearchBtn = document.getElementById("clear-search");
    
    searchInput.addEventListener("input", () => {
        clearSearchBtn.style.display = searchInput.value.length > 0 ? "block" : "none";
        renderTransactions();
    });

    clearSearchBtn.addEventListener("click", () => {
        searchInput.value = "";
        clearSearchBtn.style.display = "none";
        renderTransactions();
        searchInput.focus();
    });

    // 4. Sắp xếp thứ tự thời gian
    const sortBtn = document.getElementById("sort-order");
    sortBtn.addEventListener("click", () => {
        if (currentSortOrder === "desc") {
            currentSortOrder = "asc";
            sortBtn.innerHTML = '<i class="fa-solid fa-arrow-up-short-wide"></i> Cũ nhất';
        } else {
            currentSortOrder = "desc";
            sortBtn.innerHTML = '<i class="fa-solid fa-arrow-down-short-wide"></i> Mới nhất';
        }
        renderTransactions();
    });

    // 5. Tạo và hiển thị mã QR tĩnh khi tải trang
    const qrImg = document.getElementById("static-qr-img");
    if (qrImg) {
        // Tạo link ảnh VietQR tĩnh (chỉ hiển thị mã QR thuần túy - template qr_only)
        const staticMemo = "UnghoVungCaoYeuThuong";
        qrImg.src = `https://img.vietqr.io/image/${RECEIVER_BANK_ID}-${RECEIVER_ACCOUNT_NO}-qr_only.png?addInfo=${encodeURIComponent(staticMemo)}&accountName=${encodeURIComponent(RECEIVER_ACCOUNT_NAME)}`;
    }

    // 6. Xử lý đóng/mở Modal Giới thiệu
    const aboutModal = document.getElementById("about-modal");
    const openAboutBtn = document.getElementById("open-about-btn");
    const closeAboutBtn = document.getElementById("close-about-btn");

    if (aboutModal && openAboutBtn && closeAboutBtn) {
        // Mở modal
        openAboutBtn.addEventListener("click", () => {
            aboutModal.classList.add("active");
        });

        // Đóng modal bằng nút Close (X)
        closeAboutBtn.addEventListener("click", () => {
            aboutModal.classList.remove("active");
        });

        // Đóng modal khi click ra ngoài vùng hộp thoại
        aboutModal.addEventListener("click", (e) => {
            if (e.target === aboutModal) {
                aboutModal.classList.remove("active");
            }
        });

        // Đóng modal khi nhấn phím ESC
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && aboutModal.classList.contains("active")) {
                aboutModal.classList.remove("active");
            }
        });
    }
});

// ----------------------------------------------------
// CẬP NHẬT BẢNG VINH DANH (TOP 1 TÀI TRỢ)
// ----------------------------------------------------
function updateLeaderboard() {
    const listEl = document.getElementById("leaderboard-list");
    if (!listEl) return;

    // 1. Gom nhóm tổng tiền đóng góp theo tên người gửi (bỏ qua "Người ẩn danh")
    const groupedDonors = {};
    transactions.forEach(tx => {
        if (tx.sender && tx.sender !== "Người ẩn danh") {
            groupedDonors[tx.sender] = (groupedDonors[tx.sender] || 0) + tx.amount;
        }
    });

    const donorNames = Object.keys(groupedDonors);

    // Nếu chưa có ai quyên góp có tên, hiển thị trạng thái trống
    if (donorNames.length === 0) {
        listEl.innerHTML = `<div class="leaderboard-empty">Chưa có nhà tài trợ vinh danh</div>`;
        return;
    }

    // 2. Tìm giá trị quyên góp lớn nhất
    let maxAmount = 0;
    donorNames.forEach(name => {
        if (groupedDonors[name] > maxAmount) {
            maxAmount = groupedDonors[name];
        }
    });

    // 3. Lọc danh sách những người đạt mức tiền cao nhất (đồng hạng 1)
    const topDonors = donorNames.filter(name => groupedDonors[name] === maxAmount);
    topDonors.sort(); // Sắp xếp theo thứ tự bảng chữ cái alphabet

    listEl.innerHTML = "";
    
    // 4. Vẽ giao diện cho từng người dẫn đầu
    topDonors.forEach(name => {
        const donorCard = document.createElement("div");
        donorCard.className = "top-donor-card";
        donorCard.innerHTML = `
            <div class="donor-info-wrapper">
                <div class="donor-crown">
                    <i class="fa-solid fa-crown"></i>
                </div>
                <div class="donor-name-details">
                    <span class="donor-name">${name}</span>
                    <span class="donor-label">Dẫn đầu đóng góp</span>
                </div>
            </div>
            <div class="donor-total-amount">
                ${formatVND(maxAmount)}
            </div>
        `;
        listEl.appendChild(donorCard);
    });
}
