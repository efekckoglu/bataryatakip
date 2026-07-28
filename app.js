/* ==========================================================================
   BMW | MINI Battery Master - JavaScript Engine
   ========================================================================== */

// Dom Yüklendiğinde Başlat
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// Varsayılan / Başlangıç Örnek Verileri
const defaultVehicles = [
    {
        id: '1',
        chassis: 'WBA11AB000XXXX123',
        model: 'BMW X1 sDrive20i',
        bigBatteryDate: getDaysAgoDate(2),
        smallBatteryDate: getDaysAgoDate(5),
        note: 'Showroom alanında sergileniyor.'
    },
    {
        id: '2',
        chassis: 'WMW22CD000XXXX456',
        model: 'MINI Countryman SE',
        bigBatteryDate: getDaysAgoDate(10),
        smallBatteryDate: getDaysAgoDate(8),
        note: 'Depo alanında bekliyor, acil şarj gerekli.'
    }
];

// State
let vehicles = [];
let editingVehicleId = null;

// Uygulama Başlatma
function initApp() {
    loadVehicles();
    updateTodayDate();
    setupEventListeners();
    render();
}

// Tarih Hesaplama Yardımcısı (YYYY-MM-DD)
function getDaysAgoDate(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
}

// Bugünün Tarihini Formatla (GG.AA.YYYY)
function updateTodayDate() {
    const today = new Date();
    const formatted = formatDateTR(today.toISOString().split('T')[0]);
    const todayEl = document.getElementById('todayDate');
    if (todayEl) todayEl.innerText = formatted;
}

// Türkçe Tarih Formatlayıcı
function formatDateTR(dateString) {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    return `${day}.${month}.${year}`;
}

// İki Tarih Arasındaki Gün Farkını Hesapla
function calculateDaysDiff(dateStr) {
    if (!dateStr) return 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const past = new Date(dateStr);
    past.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(now - past);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// LocalStorage Veri Yükleme
function loadVehicles() {
    const saved = localStorage.getItem('bmw_mini_battery_vehicles');
    if (saved) {
        try {
            vehicles = JSON.parse(saved);
        } catch (e) {
            vehicles = defaultVehicles;
        }
    } else {
        vehicles = defaultVehicles;
        saveVehicles();
    }
}

// LocalStorage Veri Kaydetme
function saveVehicles() {
    localStorage.setItem('bmw_mini_battery_vehicles', JSON.stringify(vehicles));
}

// Event Listener'ları Bağlama
function setupEventListeners() {
    // Modal Açma Butonları
    const openModalBtn1 = document.getElementById('newVehicleButton');
    const openModalBtn2 = document.getElementById('openVehicleModalHeader');
    const closeModalBtn = document.getElementById('closeModal');
    const cancelModalBtn = document.getElementById('cancelVehicle');
    const saveVehicleBtn = document.getElementById('saveVehicle');

    if (openModalBtn1) openModalBtn1.addEventListener('click', openVehicleModal);
    if (openModalBtn2) openModalBtn2.addEventListener('click', openVehicleModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeVehicleModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeVehicleModal);
    if (saveVehicleBtn) saveVehicleBtn.addEventListener('click', handleSaveVehicle);

    // Detay Modalı Kapatma
    const closeDetailModalBtn = document.getElementById('closeDetailModal');
    const closeDetailBtn = document.getElementById('closeDetail');
    if (closeDetailModalBtn) closeDetailModalBtn.addEventListener('click', closeDetailModal);
    if (closeDetailBtn) closeDetailBtn.addEventListener('click', closeDetailModal);
}

// Render (Ekrana Çizdirme) Fonksiyonu
function render() {
    renderTable();
    renderCards();
    renderNotifications();
}

// Tabloyu Oluşturma
function renderTable() {
    const tableBody = document.getElementById('vehicleTable');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (vehicles.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">
                    Sistemde kayıtlı araç bulunmamaktadır.
                </td>
            </tr>
        `;
        return;
    }

    vehicles.forEach(vehicle => {
        const bigDays = calculateDaysDiff(vehicle.bigBatteryDate);
        const smallDays = calculateDaysDiff(vehicle.smallBatteryDate);

        // 7 Gün veya Üzeri Şarj Gerekli Durumu (Kritik)
        const isCritical = bigDays >= 7 || smallDays >= 7;

        const tr = document.createElement('tr');
        if (isCritical) tr.classList.add('rowDanger');

        tr.innerHTML = `
            <td class="font-mono">${vehicle.chassis}</td>
            <td class="modelName">${vehicle.model}</td>
            <td>
                ${isCritical ? `
                    <span class="statusBadge needCharge">
                        <i class="fa-solid fa-triangle-exclamation"></i> Şarj Gerekli
                    </span>
                ` : `
                    <span class="statusBadge healthy">
                        <i class="fa-solid fa-check"></i> Sağlıklı
                    </span>
                `}
            </td>
            <td>
                <div class="batteryCard">
                    <strong>${formatDateTR(vehicle.bigBatteryDate)}</strong>
                    <small>Son Bağlanma</small>
                </div>
            </td>
            <td>
                <span class="dayBadge ${getDayBadgeClass(bigDays)}">${bigDays} Gün</span>
            </td>
            <td>
                <div class="batteryCard">
                    <strong>${formatDateTR(vehicle.smallBatteryDate)}</strong>
                    <small>Son Bağlanma</small>
                </div>
            </td>
            <td>
                <span class="dayBadge ${getDayBadgeClass(smallDays)}">${smallDays} Gün</span>
            </td>
            <td>
                <div class="tableButtons">
                    <button class="detailBtn" onclick="openDetailModal('${vehicle.id}')" title="Detay"><i class="fa-solid fa-eye"></i></button>
                    <button class="editBtn" onclick="editVehicle('${vehicle.id}')" title="Düzenle"><i class="fa-solid fa-pen"></i></button>
                    <button class="deleteBtn" onclick="deleteVehicle('${vehicle.id}')" title="Sil"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;

        tableBody.appendChild(tr);
    });
}

// Gün Rozeti Renk Sınıfı
function getDayBadgeClass(days) {
    if (days >= 7) return 'red';
    if (days >= 4) return 'yellow';
    return 'green';
}

// Dashboard Kartlarını Güncelleme
function renderCards() {
    let total = vehicles.length;
    let healthy = 0;
    let warning = 0;
    let danger = 0;

    vehicles.forEach(v => {
        const bigDays = calculateDaysDiff(v.bigBatteryDate);
        const smallDays = calculateDaysDiff(v.smallBatteryDate);
        const maxDays = Math.max(bigDays, smallDays);

        if (maxDays >= 7) {
            danger++;
        } else if (maxDays >= 4) {
            warning++;
        } else {
            healthy++;
        }
    });

    const totalEl = document.getElementById('totalVehicle');
    const normalEl = document.getElementById('normalVehicle');
    const warningEl = document.getElementById('warningVehicle');
    const dangerEl = document.getElementById('dangerVehicle');

    if (totalEl) totalEl.innerText = total;
    if (normalEl) normalEl.innerText = healthy;
    if (warningEl) warningEl.innerText = warning;
    if (dangerEl) dangerEl.innerText = danger;
}

// Bildirim Alanını Güncelleme
function renderNotifications() {
    const area = document.getElementById('notificationArea');
    if (!area) return;

    area.innerHTML = '';

    const criticalVehicles = vehicles.filter(v => {
        const bigDays = calculateDaysDiff(v.bigBatteryDate);
        const smallDays = calculateDaysDiff(v.smallBatteryDate);
        return bigDays >= 7 || smallDays >= 7;
    });

    if (criticalVehicles.length === 0) {
        area.innerHTML = `
            <div class="notificationCard" style="background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.2); color: var(--status-green);">
                <div class="notificationLeft"><i class="fa-solid fa-circle-check"></i></div>
                <div class="notificationContent">
                    <h3>Tüm Araçlar Sağlıklı</h3>
                    <p>7 günü geçen herhangi bir şarj ihtiyacı bulunmuyor.</p>
                </div>
            </div>
        `;
        return;
    }

    criticalVehicles.forEach(v => {
        const bigDays = calculateDaysDiff(v.bigBatteryDate);
        const smallDays = calculateDaysDiff(v.smallBatteryDate);

        const card = document.createElement('div');
        card.className = 'notificationCard danger';
        card.innerHTML = `
            <div class="notificationLeft"><i class="fa-solid fa-circle-exclamation"></i></div>
            <div class="notificationContent">
                <h3>${v.model} (${v.chassis})</h3>
                <p>Büyük akü (${bigDays} gün) veya küçük akü (${smallDays} gün) 7 günlük süreyi aştı. Acil şarja bağlanmalıdır!</p>
            </div>
        `;
        area.appendChild(card);
    });
}

// Modal İşlemleri
function openVehicleModal() {
    editingVehicleId = null;
    document.getElementById('vehicleChassis').value = '';
    document.getElementById('vehicleModel').value = '';
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('bigBatteryDate').value = today;
    document.getElementById('smallBatteryDate').value = today;
    document.getElementById('vehicleNote').value = '';

    const modal = document.getElementById('vehicleModal');
    if (modal) modal.classList.add('active');
}

function closeVehicleModal() {
    const modal = document.getElementById('vehicleModal');
    if (modal) modal.classList.remove('active');
}

function handleSaveVehicle() {
    const chassis = document.getElementById('vehicleChassis').value.trim();
    const model = document.getElementById('vehicleModel').value.trim();
    const bigBatteryDate = document.getElementById('bigBatteryDate').value;
    const smallBatteryDate = document.getElementById('smallBatteryDate').value;
    const note = document.getElementById('vehicleNote').value.trim();

    if (!chassis || !model) {
        alert('Lütfen Şase No ve Araç Modelini doldurun.');
        return;
    }

    if (editingVehicleId) {
        // Düzenleme
        const index = vehicles.findIndex(v => v.id === editingVehicleId);
        if (index !== -1) {
            vehicles[index] = {
                ...vehicles[index],
                chassis,
                model,
                bigBatteryDate,
                smallBatteryDate,
                note
            };
        }
    } else {
        // Yeni Ekleme
        const newVehicle = {
            id: Date.now().toString(),
            chassis,
            model,
            bigBatteryDate,
            smallBatteryDate,
            note
        };
        vehicles.push(newVehicle);
    }

    saveVehicles();
    render();
    closeVehicleModal();
}

// Araç Düzenleme
window.editVehicle = function(id) {
    const vehicle = vehicles.find(v => v.id === id);
    if (!vehicle) return;

    editingVehicleId = id;
    document.getElementById('vehicleChassis').value = vehicle.chassis;
    document.getElementById('vehicleModel').value = vehicle.model;
    document.getElementById('bigBatteryDate').value = vehicle.bigBatteryDate;
    document.getElementById('smallBatteryDate').value = vehicle.smallBatteryDate;
    document.getElementById('vehicleNote').value = vehicle.note || '';

    const modal = document.getElementById('vehicleModal');
    if (modal) modal.classList.add('active');
};

// Araç Silme
window.deleteVehicle = function(id) {
    if (confirm('Bu aracı silmek istediğinize emin misiniz?')) {
        vehicles = vehicles.filter(v => v.id !== id);
        saveVehicles();
        render();
    }
};

// Detay Modalı
window.openDetailModal = function(id) {
    const vehicle = vehicles.find(v => v.id === id);
    if (!vehicle) return;

    const bigDays = calculateDaysDiff(vehicle.bigBatteryDate);
    const smallDays = calculateDaysDiff(vehicle.smallBatteryDate);
    const isCritical = bigDays >= 7 || smallDays >= 7;

    document.getElementById('detailChassis').innerText = vehicle.chassis;
    document.getElementById('detailModel').innerText = vehicle.model;
    
    const needEl = document.getElementById('detailNeed');
    if (needEl) {
        needEl.innerHTML = isCritical 
            ? '<span style="color: var(--status-red)">Şarj Gerekli</span>' 
            : '<span style="color: var(--status-green)">Sağlıklı</span>';
    }

    const modal = document.getElementById('detailModal');
    if (modal) modal.classList.add('active');
};

function closeDetailModal() {
    const modal = document.getElementById('detailModal');
    if (modal) modal.classList.remove('active');
}
