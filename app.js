/* ==========================================================================
   İnciroğlu BMW | Showroom & Otopark Akü Takip JS Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

const defaultVehicles = [
    {
        id: '1',
        chassis: 'WBA11AB000XXXX123',
        model: 'BMW i4 M50',
        location: 'showroom', // showroom | parking
        needsBattery: 'yes',
        bigBatteryDate: getDaysAgoDate(6), // >5 gün ikaz
        smallBatteryDate: getDaysAgoDate(2),
        smallBatteryConnected: 'yes',
        createdAt: '28.07.2026 09:00',
        note: 'Showroom ana sergi alanında.'
    },
    {
        id: '2',
        chassis: 'WMW22CD000XXXX456',
        model: 'MINI Countryman SE',
        location: 'showroom',
        needsBattery: 'yes',
        bigBatteryDate: getDaysAgoDate(2),
        smallBatteryDate: getDaysAgoDate(1),
        smallBatteryConnected: 'no', // Kırmızı uyarı verecek
        createdAt: '28.07.2026 10:30',
        note: 'Küçük akü takılması gerekiyor.'
    },
    {
        id: '3',
        chassis: 'WBA33EF000XXXX789',
        model: 'BMW X5 xDrive40i',
        location: 'parking',
        needsBattery: 'yes',
        bigBatteryDate: getDaysAgoDate(8), // Otopark >7 gün ikaz
        smallBatteryDate: '',
        smallBatteryConnected: 'no',
        createdAt: '27.07.2026 14:00',
        note: 'A Blok otopark alanında.'
    }
];

let vehicles = [];
let editingVehicleId = null;

function initApp() {
    loadVehicles();
    updateTodayDate();
    setupEventListeners();
    render();
}

function getDaysAgoDate(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
}

function calculateDaysDiff(dateStr) {
    if (!dateStr) return 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const past = new Date(dateStr);
    past.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(now - past);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function formatDateTR(dateString) {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    return `${day}.${month}.${year}`;
}

function updateTodayDate() {
    const today = new Date();
    const formatted = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
    const el = document.getElementById('todayDate');
    if (el) el.innerText = formatted;
}

function getCurrentDateTimeFormatted() {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function loadVehicles() {
    const saved = localStorage.getItem('inciroglu_bmw_v2_vehicles');
    if (saved) {
        try { vehicles = JSON.parse(saved); } catch (e) { vehicles = defaultVehicles; }
    } else {
        vehicles = defaultVehicles;
        saveVehicles();
    }
}

function saveVehicles() {
    localStorage.setItem('inciroglu_bmw_v2_vehicles', JSON.stringify(vehicles));
}

function setupEventListeners() {
    const openBtn1 = document.getElementById('newVehicleButton');
    const openBtn2 = document.getElementById('openVehicleModalHeader');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelVehicle');
    const saveBtn = document.getElementById('saveVehicle');

    if (openBtn1) openBtn1.addEventListener('click', openVehicleModal);
    if (openBtn2) openBtn2.addEventListener('click', openVehicleModal);
    if (closeBtn) closeBtn.addEventListener('click', closeVehicleModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeVehicleModal);
    if (saveBtn) saveBtn.addEventListener('click', handleSaveVehicle);

    const closeDetailModalBtn = document.getElementById('closeDetailModal');
    const closeDetailBtn = document.getElementById('closeDetail');
    if (closeDetailModalBtn) closeDetailModalBtn.addEventListener('click', closeDetailModal);
    if (closeDetailBtn) closeDetailBtn.addEventListener('click', closeDetailModal);
}

// Modal Alan Kontrolleri
window.toggleBatteryDatesGroup = function() {
    const select = document.getElementById('needsBatterySelect');
    const group = document.getElementById('batteryDatesGroup');
    if (select && group) {
        if (select.value === 'yes') {
            group.classList.remove('hidden');
        } else {
            group.classList.add('hidden');
        }
    }
    toggleSmallBatteryOption();
};

window.toggleSmallBatteryOption = function() {
    const location = document.getElementById('vehicleLocation').value;
    const smallGroup1 = document.getElementById('smallBatteryDateGroup');
    const smallGroup2 = document.getElementById('smallBatteryStatusGroup');

    if (location === 'showroom') {
        if (smallGroup1) smallGroup1.classList.remove('hidden');
        if (smallGroup2) smallGroup2.classList.remove('hidden');
    } else {
        if (smallGroup1) smallGroup1.classList.add('hidden');
        if (smallGroup2) smallGroup2.classList.add('hidden');
    }
};

function render() {
    renderShowroomTable();
    renderParkingTable();
    renderCards();
    renderNotifications();
}

// 1. Showroom Tablosu
function renderShowroomTable() {
    const body = document.getElementById('showroomTableBody');
    if (!body) return;
    body.innerHTML = '';

    const showroomVehicles = vehicles.filter(v => v.location === 'showroom');

    if (showroomVehicles.length === 0) {
        body.innerHTML = `<tr><td colspan="8" style="text-align:center; color: var(--text-muted); padding: 18px;">Showroomda araç bulunmuyor.</td></tr>`;
        return;
    }

    showroomVehicles.forEach(vehicle => {
        const bigDays = vehicle.bigBatteryDate ? calculateDaysDiff(vehicle.bigBatteryDate) : 0;
        const isBigBatteryAlert = vehicle.needsBattery === 'yes' && bigDays > 5;
        const isSmallDisconnected = vehicle.needsBattery === 'yes' && vehicle.smallBatteryConnected === 'no';
        const isCritical = isBigBatteryAlert || isSmallDisconnected;

        const tr = document.createElement('tr');
        if (isCritical) tr.classList.add('rowDanger');

        tr.innerHTML = `
            <td style="font-family: monospace; font-weight: 600;">${vehicle.chassis}</td>
            <td style="font-weight: 600;">${vehicle.model}</td>
            <td>
                ${vehicle.needsBattery === 'yes' 
                    ? `<span class="statusBadge needCharge"><i class="fa-solid fa-bolt"></i> Gerekiyor</span>` 
                    : `<span class="statusBadge healthy"><i class="fa-solid fa-check"></i> Gerekmiyor</span>`}
            </td>
            <td>${formatDateTR(vehicle.bigBatteryDate)}</td>
            <td>
                <span class="smallBatteryBadge ${bigDays > 5 ? 'disconnected' : 'connected'}">${bigDays} Gün</span>
            </td>
            <td>
                ${vehicle.smallBatteryConnected === 'yes'
                    ? `<span class="smallBatteryBadge connected"><i class="fa-solid fa-circle"></i> Bağlı</span>`
                    : `<span class="smallBatteryBadge disconnected"><i class="fa-solid fa-triangle-exclamation"></i> Bağlı Değil</span>`}
            </td>
            <td style="font-size:12px; color: var(--text-secondary);">${vehicle.createdAt || '-'}</td>
            <td>
                <div class="tableButtons">
                    <button onclick="openDetailModal('${vehicle.id}')" title="Detay"><i class="fa-solid fa-eye"></i></button>
                    <button onclick="editVehicle('${vehicle.id}')" title="Düzenle"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteVehicle('${vehicle.id}')" title="Sil"><i class="fa-solid fa-trash" style="color: #ef4444;"></i></button>
                </div>
            </td>
        `;
        body.appendChild(tr);
    });
}

// 2. Otopark Tablosu
function renderParkingTable() {
    const body = document.getElementById('parkingTableBody');
    if (!body) return;
    body.innerHTML = '';

    const parkingVehicles = vehicles.filter(v => v.location === 'parking');

    if (parkingVehicles.length === 0) {
        body.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 18px;">Otoparkta kayıtlı araç bulunmuyor.</td></tr>`;
        return;
    }

    parkingVehicles.forEach(vehicle => {
        const bigDays = vehicle.bigBatteryDate ? calculateDaysDiff(vehicle.bigBatteryDate) : 0;
        const isParkingAlert = vehicle.needsBattery === 'yes' && bigDays >= 7; // 1 haftayı geçtiyse

        const tr = document.createElement('tr');
        if (isParkingAlert) tr.classList.add('rowDanger');

        tr.innerHTML = `
            <td style="font-family: monospace; font-weight: 600;">${vehicle.chassis}</td>
            <td style="font-weight: 600;">${vehicle.model}</td>
            <td>
                ${vehicle.needsBattery === 'yes' 
                    ? `<span class="statusBadge needCharge"><i class="fa-solid fa-bolt"></i> Gerekiyor</span>` 
                    : `<span class="statusBadge healthy"><i class="fa-solid fa-check"></i> Gerekmiyor</span>`}
            </td>
            <td>${formatDateTR(vehicle.bigBatteryDate)}</td>
            <td>
                <span class="smallBatteryBadge ${bigDays >= 7 ? 'disconnected' : 'connected'}">${bigDays} Gün</span>
            </td>
            <td style="font-size:12px; color: var(--text-secondary);">${vehicle.createdAt || '-'}</td>
            <td>
                <div class="tableButtons">
                    <button onclick="openDetailModal('${vehicle.id}')" title="Detay"><i class="fa-solid fa-eye"></i></button>
                    <button onclick="editVehicle('${vehicle.id}')" title="Düzenle"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteVehicle('${vehicle.id}')" title="Sil"><i class="fa-solid fa-trash" style="color: #ef4444;"></i></button>
                </div>
            </td>
        `;
        body.appendChild(tr);
    });
}

function renderCards() {
    const total = vehicles.length;
    const showroom = vehicles.filter(v => v.location === 'showroom').length;
    const parking = vehicles.filter(v => v.location === 'parking').length;

    let dangerCount = 0;
    vehicles.forEach(v => {
        const bigDays = v.bigBatteryDate ? calculateDaysDiff(v.bigBatteryDate) : 0;
        if (v.location === 'showroom') {
            if ((v.needsBattery === 'yes' && bigDays > 5) || (v.needsBattery === 'yes' && v.smallBatteryConnected === 'no')) {
                dangerCount++;
            }
        } else if (v.location === 'parking') {
            if (v.needsBattery === 'yes' && bigDays >= 7) {
                dangerCount++;
            }
        }
    });

    if (document.getElementById('totalVehicle')) document.getElementById('totalVehicle').innerText = total;
    if (document.getElementById('showroomCount')) document.getElementById('showroomCount').innerText = showroom;
    if (document.getElementById('parkingCount')) document.getElementById('parkingCount').innerText = parking;
    if (document.getElementById('dangerVehicle')) document.getElementById('dangerVehicle').innerText = dangerCount;
}

function renderNotifications() {
    const area = document.getElementById('notificationArea');
    if (!area) return;
    area.innerHTML = '';

    const notifications = [];

    vehicles.forEach(v => {
        const bigDays = v.bigBatteryDate ? calculateDaysDiff(v.bigBatteryDate) : 0;
        if (v.location === 'showroom') {
            if (v.needsBattery === 'yes' && bigDays > 5) {
                notifications.push(`⚠️ <strong>${v.model} (${v.chassis})</strong>: Showroom büyük akü şarj/bağlantı süresi 5 günü geçti (${bigDays} gün)!`);
            }
            if (v.needsBattery === 'yes' && v.smallBatteryConnected === 'no') {
                notifications.push(`🔌 <strong>${v.model} (${v.chassis})</strong>: Showroom aracı, <strong>Küçüğe Bağla Uyarısı!</strong>`);
            }
        } else if (v.location === 'parking') {
            if (v.needsBattery === 'yes' && bigDays >= 7) {
                notifications.push(`🚨 <strong>${v.model} (${v.chassis})</strong>: Otopark aracı, 1 haftalık akü kontrol uyarısı (${bigDays} gündür bağlı değil)!`);
            }
        }
    });

    if (notifications.length === 0) {
        area.innerHTML = `
            <div style="background: #dcfce7; color: #15803d; padding: 12px 16px; border-radius: 10px; font-size: 13px;">
                <i class="fa-solid fa-circle-check"></i> Şu an ikaz veya akü uyarısı veren araç bulunmamaktadır.
            </div>
        `;
        return;
    }

    notifications.forEach(msg => {
        const card = document.createElement('div');
        card.className = 'notificationCard';
        card.innerHTML = msg;
        area.appendChild(card);
    });
}

function openVehicleModal() {
    editingVehicleId = null;
    document.getElementById('modalTitle').innerText = 'Yeni Araç Ekle';
    document.getElementById('vehicleChassis').value = '';
    document.getElementById('vehicleModel').value = '';
    document.getElementById('vehicleLocation').value = 'showroom';
    document.getElementById('needsBatterySelect').value = 'no';
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('bigBatteryDate').value = today;
    document.getElementById('smallBatteryDate').value = today;
    document.getElementById('smallBatteryConnected').value = 'yes';
    document.getElementById('vehicleNote').value = '';

    document.getElementById('createdAtGroup').classList.add('hidden');
    toggleBatteryDatesGroup();

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
    const location = document.getElementById('vehicleLocation').value;
    const needsBattery = document.getElementById('needsBatterySelect').value;
    const bigBatteryDate = document.getElementById('bigBatteryDate').value;
    const smallBatteryDate = document.getElementById('smallBatteryDate').value;
    const smallBatteryConnected = document.getElementById('smallBatteryConnected').value;
    const note = document.getElementById('vehicleNote').value.trim();

    if (!chassis || !model) {
        alert('Lütfen Şase No ve Marka/Model alanlarını doldurunuz.');
        return;
    }

    if (editingVehicleId) {
        const index = vehicles.findIndex(v => v.id === editingVehicleId);
        if (index !== -1) {
            vehicles[index] = {
                ...vehicles[index],
                chassis,
                model,
                location,
                needsBattery,
                bigBatteryDate: needsBattery === 'yes' ? bigBatteryDate : '',
                smallBatteryDate: (needsBattery === 'yes' && location === 'showroom') ? smallBatteryDate : '',
                smallBatteryConnected: location === 'showroom' ? smallBatteryConnected : 'no',
                note
            };
        }
    } else {
        const newVehicle = {
            id: Date.now().toString(),
            chassis,
            model,
            location,
            needsBattery,
            bigBatteryDate: needsBattery === 'yes' ? bigBatteryDate : '',
            smallBatteryDate: (needsBattery === 'yes' && location === 'showroom') ? smallBatteryDate : '',
            smallBatteryConnected: location === 'showroom' ? smallBatteryConnected : 'no',
            createdAt: getCurrentDateTimeFormatted(),
            note
        };
        vehicles.push(newVehicle);
    }

    saveVehicles();
    render();
    closeVehicleModal();
}

window.editVehicle = function(id) {
    const vehicle = vehicles.find(v => v.id === id);
    if (!vehicle) return;

    editingVehicleId = id;
    document.getElementById('modalTitle').innerText = 'Aracı Düzenle';
    document.getElementById('vehicleChassis').value = vehicle.chassis;
    document.getElementById('vehicleModel').value = vehicle.model;
    document.getElementById('vehicleLocation').value = vehicle.location;
    document.getElementById('needsBatterySelect').value = vehicle.needsBattery;
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('bigBatteryDate').value = vehicle.bigBatteryDate || today;
    document.getElementById('smallBatteryDate').value = vehicle.smallBatteryDate || today;
    document.getElementById('smallBatteryConnected').value = vehicle.smallBatteryConnected || 'yes';
    document.getElementById('vehicleNote').value = vehicle.note || '';

    const createdAtField = document.getElementById('vehicleCreatedAtDisplay');
    const createdAtGroup = document.getElementById('createdAtGroup');
    if (createdAtField && createdAtGroup) {
        createdAtField.value = vehicle.createdAt || '-';
        createdAtGroup.classList.remove('hidden');
    }

    toggleBatteryDatesGroup();

    const modal = document.getElementById('vehicleModal');
    if (modal) modal.classList.add('active');
};

window.deleteVehicle = function(id) {
    const vehicle = vehicles.find(v => v.id === id);
    if (!vehicle) return;

    if (confirm(`${vehicle.model} (${vehicle.chassis}) silinecek. Onaylıyor musunuz?`)) {
        vehicles = vehicles.filter(v => v.id !== id);
        saveVehicles();
        render();
    }
};

window.openDetailModal = function(id) {
    const vehicle = vehicles.find(v => v.id === id);
    if (!vehicle) return;

    document.getElementById('detailChassis').innerText = vehicle.chassis;
    document.getElementById('detailModel').innerText = vehicle.model;
    document.getElementById('detailLocation').innerText = vehicle.location === 'showroom' ? 'Showroom' : 'Otopark / Stok';
    document.getElementById('detailNeeds').innerText = vehicle.needsBattery === 'yes' ? 'Akü Bağlantısı Var' : 'Yok';
    document.getElementById('detailBigDate').innerText = formatDateTR(vehicle.bigBatteryDate);
    document.getElementById('detailSmallDate').innerText = vehicle.location === 'showroom' ? formatDateTR(vehicle.smallBatteryDate) : 'N/A';
    document.getElementById('detailNoteText').innerText = vehicle.note || 'Not bulunmuyor.';

    const modal = document.getElementById('detailModal');
    if (modal) modal.classList.add('active');
};

function closeDetailModal() {
    const modal = document.getElementById('detailModal');
    if (modal) modal.classList.remove('active');
}

// CANLI ENVANTER EXCEL (XLSX) DIŞA AKTARMA
window.exportInventoryToExcel = function() {
    if (vehicles.length === 0) {
        alert('Sistemde indirilecek araç verisi bulunmuyor.');
        return;
    }

    // O anki tüm veriyi detaylı tablo objesine çevirme
    const exportData = vehicles.map(v => {
        const bigDays = v.bigBatteryDate ? calculateDaysDiff(v.bigBatteryDate) : 0;
        let ikazDurumu = 'Sağlıklı';

        if (v.location === 'showroom') {
            if (v.needsBattery === 'yes' && bigDays > 5) ikazDurumu = 'Büyük Akü İkazı (>5 Gün)';
            if (v.needsBattery === 'yes' && v.smallBatteryConnected === 'no') ikazDurumu = 'Küçük Akü Bağlı Değil';
        } else {
            if (v.needsBattery === 'yes' && bigDays >= 7) ikazDurumu = 'Otopark Kontrol Uyarısı (>=7 Gün)';
        }

        return {
            "Şase No (VIN)": v.chassis,
            "Marka Model": v.model,
            "Araç Konumu": v.location === 'showroom' ? 'Showroom' : 'Otopark / Stok',
            "Akü Bağlantısı Var Mı": v.needsBattery === 'yes' ? 'Evet' : 'Hayır',
            "Büyük Akü Bağlantı Tarihi": formatDateTR(v.bigBatteryDate),
            "Büyük Akü Geçen Gün": bigDays,
            "Küçük Akü Durumu (Showroom)": v.location === 'showroom' ? (v.smallBatteryConnected === 'yes' ? 'Bağlı' : 'Bağlı Değil') : 'N/A',
            "Küçük Akü Tarihi": v.location === 'showroom' ? formatDateTR(v.smallBatteryDate) : 'N/A',
            "Genel İkaz Durumu": ikazDurumu,
            "Sisteme Kayıt Tarihi": v.createdAt || '-',
            "Araç Notu": v.note || '-'
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Canlı Araç Envanteri");

    const fileName = `Inciroglu_BMW_Canli_Envanter_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
};
