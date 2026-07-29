/* ==========================================================================
   İnciroğlu BMW | Stok & Akü Takip JS Engine
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
        bigBatteryDate: getDaysAgoDate(6), // >5 gün uyarısı
        smallBatteryDate: getDaysAgoDate(2),
        smallBatteryConnected: 'yes',
        parkingDate: '',
        notesHistory: [
            { date: '28.07.2026 09:00', note: 'Araç showroom alanına yerleştirildi.' },
            { date: '28.07.2026 14:20', note: 'Büyük akü şarja takıldı.' }
        ]
    },
    {
        id: '2',
        chassis: 'WMW22CD000XXXX456',
        model: 'MINI Countryman SE',
        location: 'showroom',
        bigBatteryDate: getDaysAgoDate(2),
        smallBatteryDate: getDaysAgoDate(1),
        smallBatteryConnected: 'no', // Küçük akü uyarısı
        parkingDate: '',
        notesHistory: [
            { date: '28.07.2026 10:30', note: 'Showroom sergi alanında. Küçük akü takviyesi bekleniyor.' }
        ]
    },
    {
        id: '3',
        chassis: 'WBA33EF000XXXX789',
        model: 'BMW X5 xDrive40i',
        location: 'parking',
        bigBatteryDate: getDaysAgoDate(12), // >10 gün uyarısı
        smallBatteryDate: '',
        smallBatteryConnected: 'no',
        parkingDate: getDaysAgoDate(15),
        notesHistory: [
            { date: '27.07.2026 11:00', note: 'A Blok otoparka çekildi.' }
        ]
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
    const saved = localStorage.getItem('inciroglu_bmw_v3_vehicles');
    if (saved) {
        try { vehicles = JSON.parse(saved); } catch (e) { vehicles = defaultVehicles; }
    } else {
        vehicles = defaultVehicles;
        saveVehicles();
    }
}

function saveVehicles() {
    localStorage.setItem('inciroglu_bmw_v3_vehicles', JSON.stringify(vehicles));
}

function setupEventListeners() {
    const openBtn1 = document.getElementById('openVehicleModalHeader');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelVehicle');
    const saveBtn = document.getElementById('saveVehicle');

    if (openBtn1) openBtn1.addEventListener('click', openVehicleModal);
    if (closeBtn) closeBtn.addEventListener('click', closeVehicleModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeVehicleModal);
    if (saveBtn) saveBtn.addEventListener('click', handleSaveVehicle);

    const closeDetailModalBtn = document.getElementById('closeDetailModal');
    const closeDetailBtn = document.getElementById('closeDetail');
    if (closeDetailModalBtn) closeDetailModalBtn.addEventListener('click', closeDetailModal);
    if (closeDetailBtn) closeDetailBtn.addEventListener('click', closeDetailModal);
}

window.handleLocationChangeInModal = function() {
    const location = document.getElementById('vehicleLocation').value;
    const parkingGroup = document.getElementById('parkingDateGroup');
    const smallGroup1 = document.getElementById('smallBatteryDateGroup');
    const smallGroup2 = document.getElementById('smallBatteryStatusGroup');

    if (location === 'parking') {
        if (parkingGroup) parkingGroup.classList.remove('hidden');
        if (smallGroup1) smallGroup1.classList.add('hidden');
        if (smallGroup2) smallGroup2.classList.add('hidden');
    } else {
        if (parkingGroup) parkingGroup.classList.add('hidden');
        if (smallGroup1) smallGroup1.classList.remove('hidden');
        if (smallGroup2) smallGroup2.classList.remove('hidden');
    }
};

function render() {
    renderShowroomTable();
    renderParkingTable();
    renderCards();
    renderNotifications();
}

// 1. SHOWROOM TABLOSU
function renderShowroomTable() {
    const body = document.getElementById('showroomTableBody');
    if (!body) return;
    body.innerHTML = '';

    const showroomVehicles = vehicles.filter(v => v.location === 'showroom');

    if (showroomVehicles.length === 0) {
        body.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 18px;">Showroomda araç bulunmuyor.</td></tr>`;
        return;
    }

    showroomVehicles.forEach(vehicle => {
        const bigDays = vehicle.bigBatteryDate ? calculateDaysDiff(vehicle.bigBatteryDate) : 0;
        const needsCharge = bigDays >= 5; // 5 gün oldu ise bağlanması gerekli

        const tr = document.createElement('tr');
        if (needsCharge || vehicle.smallBatteryConnected === 'no') tr.classList.add('rowDanger');

        tr.innerHTML = `
            <td style="font-family: monospace; font-weight: 600;">${vehicle.chassis}</td>
            <td style="font-weight: 600;">${vehicle.model}</td>
            <td>${formatDateTR(vehicle.bigBatteryDate)}</td>
            <td><strong>${bigDays} Gün</strong></td>
            <td>
                ${vehicle.smallBatteryConnected === 'yes'
                    ? `<span class="smallBatteryBadge connected"><i class="fa-solid fa-circle"></i> Bağlı</span>`
                    : `<span class="smallBatteryBadge disconnected"><i class="fa-solid fa-unlink"></i> Bağlı Değil</span>`}
            </td>
            <td>
                ${needsCharge 
                    ? `<span class="statusBadge needCharge"><i class="fa-solid fa-triangle-exclamation"></i> Bağlanması Gerekli</span>` 
                    : `<span class="statusBadge healthy"><i class="fa-solid fa-check"></i> İhtiyacı Yok</span>`}
            </td>
            <td>
                <div class="tableButtons">
                    <button onclick="openDetailModal('${vehicle.id}')" title="Detay & Not Geçmişi"><i class="fa-solid fa-eye"></i></button>
                    <button onclick="editVehicle('${vehicle.id}')" title="Düzenle / Tarih Güncelle"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteVehicle('${vehicle.id}')" title="Sil"><i class="fa-solid fa-trash" style="color: #ef4444;"></i></button>
                </div>
            </td>
        `;
        body.appendChild(tr);
    });
}

// 2. OTOPARK TABLOSU
function renderParkingTable() {
    const body = document.getElementById('parkingTableBody');
    if (!body) return;
    body.innerHTML = '';

    const parkingVehicles = vehicles.filter(v => v.location === 'parking');

    if (parkingVehicles.length === 0) {
        body.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 18px;">Otoparkta araç bulunmuyor.</td></tr>`;
        return;
    }

    parkingVehicles.forEach(vehicle => {
        const bigDays = vehicle.bigBatteryDate ? calculateDaysDiff(vehicle.bigBatteryDate) : 0;
        const needsCharge = bigDays > 10; // 10 günü geçti ise uyarı

        const tr = document.createElement('tr');
        if (needsCharge) tr.classList.add('rowDanger');

        tr.innerHTML = `
            <td style="font-family: monospace; font-weight: 600;">${vehicle.chassis}</td>
            <td style="font-weight: 600;">${vehicle.model}</td>
            <td>${formatDateTR(vehicle.parkingDate)}</td>
            <td>${formatDateTR(vehicle.bigBatteryDate)}</td>
            <td>
                ${needsCharge 
                    ? `<span class="statusBadge needCharge"><i class="fa-solid fa-clock-rotate-left"></i> 10 Günü Geçti - Uyarı</span>` 
                    : `<span class="statusBadge healthy"><i class="fa-solid fa-check"></i> Durum İyi (${bigDays} Gün)</span>`}
            </td>
            <td>
                <div class="tableButtons">
                    <button onclick="openDetailModal('${vehicle.id}')" title="Detay & Not Geçmişi"><i class="fa-solid fa-eye"></i></button>
                    <button onclick="editVehicle('${vehicle.id}')" title="Düzenle / Tarih Güncelle"><i class="fa-solid fa-pen"></i></button>
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
            if (bigDays >= 5 || v.smallBatteryConnected === 'no') dangerCount++;
        } else if (v.location === 'parking') {
            if (bigDays > 10) dangerCount++;
        }
    });

    if (document.getElementById('totalVehicle')) document.getElementById('totalVehicle').innerText = total;
    if (document.getElementById('showroomCount')) document.getElementById('showroomCount').innerText = showroom;
    if (document.getElementById('parkingCount')) document.getElementById('parkingCount').innerText = parking;
    if (document.getElementById('dangerVehicle')) document.getElementById('dangerVehicle').innerText = dangerCount;
}

// 3. EN ALTTAN BİLDİRİMLER PANANELİ
function renderNotifications() {
    const area = document.getElementById('notificationArea');
    if (!area) return;
    area.innerHTML = '';

    const notifications = [];

    vehicles.forEach(v => {
        const bigDays = v.bigBatteryDate ? calculateDaysDiff(v.bigBatteryDate) : 0;
        if (v.location === 'showroom') {
            if (bigDays >= 5) {
                notifications.push(`🔌 <strong>${v.model} (${v.chassis})</strong>: Showroom büyük akü bağlanalı <strong>${bigDays} gün</strong> oldu. Şarj / Akü bağlanması gerekli!`);
            }
            if (v.smallBatteryConnected === 'no') {
                notifications.push(`⚠️ <strong>${v.model} (${v.chassis})</strong>: Showroom aracı küçük akü <strong>bağlı değil!</strong>`);
            }
        } else if (v.location === 'parking') {
            if (bigDays > 10) {
                notifications.push(`🚨 <strong>${v.model} (${v.chassis})</strong>: Otopark aracı büyük aküye bağlanalı <strong>${bigDays} gün (10 günü geçti)</strong>! Kontrol edilmesi gerekiyor.`);
            }
        }
    });

    if (notifications.length === 0) {
        area.innerHTML = `
            <div style="background: #dcfce7; color: #15803d; padding: 12px 16px; border-radius: 10px; font-size: 13px;">
                <i class="fa-solid fa-circle-check"></i> Şu an ikaz gerektiren bir araç bulunmuyor. Tüm akü durumları stabil.
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
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('parkingDate').value = today;
    document.getElementById('bigBatteryDate').value = today;
    document.getElementById('smallBatteryDate').value = today;
    document.getElementById('smallBatteryConnected').value = 'yes';
    document.getElementById('vehicleNote').value = '';

    handleLocationChangeInModal();

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
    const parkingDate = document.getElementById('parkingDate').value;
    const bigBatteryDate = document.getElementById('bigBatteryDate').value;
    const smallBatteryDate = document.getElementById('smallBatteryDate').value;
    const smallBatteryConnected = document.getElementById('smallBatteryConnected').value;
    const noteText = document.getElementById('vehicleNote').value.trim();

    if (!chassis || !model) {
        alert('Lütfen Şase No ve Marka/Model alanlarını doldurunuz.');
        return;
    }

    const timeStamp = getCurrentDateTimeFormatted();
    const newNoteObj = noteText ? { date: timeStamp, note: noteText } : null;

    if (editingVehicleId) {
        // Düzenleme
        const index = vehicles.findIndex(v => v.id === editingVehicleId);
        if (index !== -1) {
            const history = vehicles[index].notesHistory || [];
            if (newNoteObj) history.unshift(newNoteObj); // Yeni notu başa ekle

            vehicles[index] = {
                ...vehicles[index],
                chassis,
                model,
                location,
                parkingDate: location === 'parking' ? parkingDate : '',
                bigBatteryDate,
                smallBatteryDate: location === 'showroom' ? smallBatteryDate : '',
                smallBatteryConnected: location === 'showroom' ? smallBatteryConnected : 'no',
                notesHistory: history
            };
        }
    } else {
        // Yeni Kayıt
        const history = newNoteObj ? [newNoteObj] : [{ date: timeStamp, note: 'Sisteme araç kaydı oluşturuldu.' }];
        const newVehicle = {
            id: Date.now().toString(),
            chassis,
            model,
            location,
            parkingDate: location === 'parking' ? parkingDate : '',
            bigBatteryDate,
            smallBatteryDate: location === 'showroom' ? smallBatteryDate : '',
            smallBatteryConnected: location === 'showroom' ? smallBatteryConnected : 'no',
            notesHistory: history
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
    document.getElementById('modalTitle').innerText = 'Aracı Düzenle / Akü Tarihi Güncelle';
    document.getElementById('vehicleChassis').value = vehicle.chassis;
    document.getElementById('vehicleModel').value = vehicle.model;
    document.getElementById('vehicleLocation').value = vehicle.location;
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('parkingDate').value = vehicle.parkingDate || today;
    document.getElementById('bigBatteryDate').value = vehicle.bigBatteryDate || today;
    document.getElementById('smallBatteryDate').value = vehicle.smallBatteryDate || today;
    document.getElementById('smallBatteryConnected').value = vehicle.smallBatteryConnected || 'yes';
    document.getElementById('vehicleNote').value = '';

    handleLocationChangeInModal();

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
    document.getElementById('detailLocation').innerText = vehicle.location === 'showroom' ? 'Showroom' : 'Otopark';
    document.getElementById('detailBigDate').innerText = formatDateTR(vehicle.bigBatteryDate);
    document.getElementById('detailSmallDate').innerText = vehicle.location === 'showroom' ? formatDateTR(vehicle.smallBatteryDate) : 'N/A';
    document.getElementById('detailParkDate').innerText = vehicle.location === 'parking' ? formatDateTR(vehicle.parkingDate) : 'N/A';

    const notesContainer = document.getElementById('detailNotesHistory');
    notesContainer.innerHTML = '';

    const history = vehicle.notesHistory || [];
    if (history.length === 0) {
        notesContainer.innerHTML = `<p style="font-size:12px; color:var(--text-muted);">Kayıtlı not bulunmuyor.</p>`;
    } else {
        history.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'historyNoteItem';
            itemDiv.innerHTML = `
                <div class="noteDate">${item.date}</div>
                <div class="noteText">${item.note}</div>
            `;
            notesContainer.appendChild(itemDiv);
        });
    }

    const modal = document.getElementById('detailModal');
    if (modal) modal.classList.add('active');
};

function closeDetailModal() {
    const modal = document.getElementById('detailModal');
    if (modal) modal.classList.remove('active');
}

// İSTENİLEN REVEZE EDİLMİŞ EXCEL DIŞA AKTARMA
window.exportInventoryToExcel = function() {
    if (vehicles.length === 0) {
        alert('İndirilecek araç kaydı bulunmuyor.');
        return;
    }

    const exportData = vehicles.map(v => {
        // Tüm geçmiş notları birleştirme
        const historyText = v.notesHistory 
            ? v.notesHistory.map(h => `[${h.date}] ${h.note}`).join(' | ')
            : '-';

        return {
            "Şase No": v.chassis,
            "Marka Model": v.model,
            "Büyük Aküye Bağlandığı Tarih": formatDateTR(v.bigBatteryDate),
            "Küçük Aküye Bağlandığı Tarih": v.location === 'showroom' ? formatDateTR(v.smallBatteryDate) : 'N/A',
            "Eklenilen Geçmiş Notlar": historyText
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Guncel_Stok_Aku_Listesi");

    const fileName = `Inciroglu_BMW_Guncel_Stok_Aku_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
};
