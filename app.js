/* ==========================================================================
   İnciroğlu BMW | Stok & Akü Takip JS Engine (Revize Mantık)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

const defaultVehicles = [
    {
        id: '1',
        chassis: 'WBA11AB000XXXX123',
        model: 'BMW i4 M50',
        location: 'showroom',
        batteryRequired: 'yes',
        bigBatteryDate: getDaysAgoDate(6),
        smallBatteryDate: getDaysAgoDate(2),
        smallBatteryConnected: 'yes',
        parkingDate: '',
        notesHistory: [
            { date: '28.07.2026 09:00', note: 'Showroom sergi alanına alındı.' },
            { date: '28.07.2026 14:20', note: 'Büyük akü şarja bağlandı.' }
        ]
    },
    {
        id: '2',
        chassis: 'WMW22CD000XXXX456',
        model: 'MINI Cooper SE',
        location: 'showroom',
        batteryRequired: 'no', // Akü bağlantısı gerekli değil
        bigBatteryDate: '',
        smallBatteryDate: '',
        smallBatteryConnected: 'no',
        parkingDate: '',
        notesHistory: [
            { date: '29.07.2026 10:00', note: 'Sergide statik duruyor, akü bağlantısına gerek görülmedi.' }
        ]
    }
];

let vehicles = [];
let editingVehicleId = null;

function initApp() {
    loadVehicles();
    updateTodayDate();
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
    if (!dateString) return 'Gerekli Değil';
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
    const saved = localStorage.getItem('inciroglu_bmw_v4_vehicles');
    if (saved) {
        try { vehicles = JSON.parse(saved); } catch (e) { vehicles = defaultVehicles; }
    } else {
        vehicles = defaultVehicles;
        saveVehicles();
    }
}

function saveVehicles() {
    localStorage.setItem('inciroglu_bmw_v4_vehicles', JSON.stringify(vehicles));
}

window.toggleBatteryDateInputs = function() {
    const batteryRequired = document.getElementById('batteryRequired').value;
    const wrapper = document.getElementById('batteryDatesWrapper');
    if (batteryRequired === 'yes') {
        wrapper.classList.remove('hidden');
    } else {
        wrapper.classList.add('hidden');
    }
};

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
        const isRequired = vehicle.batteryRequired === 'yes';
        const bigDays = (isRequired && vehicle.bigBatteryDate) ? calculateDaysDiff(vehicle.bigBatteryDate) : 0;
        const needsCharge = isRequired && bigDays >= 5;

        const tr = document.createElement('tr');
        if (needsCharge) tr.classList.add('rowDanger');

        tr.innerHTML = `
            <td style="font-family: monospace; font-weight: 600;">${vehicle.chassis}</td>
            <td style="font-weight: 600;">${vehicle.model}</td>
            <td>${isRequired ? formatDateTR(vehicle.bigBatteryDate) : '<span style="color:var(--text-muted)">Gerekli Değil</span>'}</td>
            <td>${isRequired ? `<strong>${bigDays} Gün</strong>` : '-'}</td>
            <td>
                ${!isRequired ? '<span style="color:var(--text-muted)">Gerekli Değil</span>' : 
                  (vehicle.smallBatteryConnected === 'yes'
                    ? `<span class="smallBatteryBadge connected"><i class="fa-solid fa-circle"></i> Bağlı</span>`
                    : `<span class="smallBatteryBadge disconnected"><i class="fa-solid fa-unlink"></i> Bağlı Değil</span>`)}
            </td>
            <td>
                ${!isRequired ? `<span class="statusBadge healthy" style="background:#f1f5f9; color:#64748b;"><i class="fa-solid fa-minus"></i> Muaf</span>` :
                  (needsCharge 
                    ? `<span class="statusBadge needCharge"><i class="fa-solid fa-triangle-exclamation"></i> Bağlanması Gerekli</span>` 
                    : `<span class="statusBadge healthy"><i class="fa-solid fa-check"></i> İhtiyacı Yok</span>`)}
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
        const isRequired = vehicle.batteryRequired === 'yes';
        const bigDays = (isRequired && vehicle.bigBatteryDate) ? calculateDaysDiff(vehicle.bigBatteryDate) : 0;
        const needsCharge = isRequired && bigDays > 10;

        const tr = document.createElement('tr');
        if (needsCharge) tr.classList.add('rowDanger');

        tr.innerHTML = `
            <td style="font-family: monospace; font-weight: 600;">${vehicle.chassis}</td>
            <td style="font-weight: 600;">${vehicle.model}</td>
            <td>${formatDateTR(vehicle.parkingDate)}</td>
            <td>${isRequired ? formatDateTR(vehicle.bigBatteryDate) : '<span style="color:var(--text-muted)">Gerekli Değil</span>'}</td>
            <td>
                ${!isRequired ? `<span class="statusBadge healthy" style="background:#f1f5f9; color:#64748b;"><i class="fa-solid fa-minus"></i> Muaf</span>` :
                  (needsCharge 
                    ? `<span class="statusBadge needCharge"><i class="fa-solid fa-clock-rotate-left"></i> 10 Günü Geçti - Uyarı</span>` 
                    : `<span class="statusBadge healthy"><i class="fa-solid fa-check"></i> Durum İyi (${bigDays} Gün)</span>`)}
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
        if (v.batteryRequired === 'yes') {
            const bigDays = v.bigBatteryDate ? calculateDaysDiff(v.bigBatteryDate) : 0;
            if (v.location === 'showroom' && (bigDays >= 5 || v.smallBatteryConnected === 'no')) dangerCount++;
            if (v.location === 'parking' && bigDays > 10) dangerCount++;
        }
    });

    if (document.getElementById('totalVehicle')) document.getElementById('totalVehicle').innerText = total;
    if (document.getElementById('showroomCount')) document.getElementById('showroomCount').innerText = showroom;
    if (document.getElementById('parkingCount')) document.getElementById('parkingCount').innerText = parking;
    if (document.getElementById('dangerVehicle')) document.getElementById('dangerVehicle').innerText = dangerCount;
}

// 3. EN ALTTAN BİLDİRİMLER
function renderNotifications() {
    const area = document.getElementById('notificationArea');
    if (!area) return;
    area.innerHTML = '';

    const notifications = [];

    vehicles.forEach(v => {
        if (v.batteryRequired === 'yes') {
            const bigDays = v.bigBatteryDate ? calculateDaysDiff(v.bigBatteryDate) : 0;
            if (v.location === 'showroom') {
                if (bigDays >= 5) {
                    notifications.push(`🔌 <strong>${v.model} (${v.chassis})</strong>: Showroom büyük akü bağlanalı <strong>${bigDays} gün</strong> oldu. Akü bağlanması gerekli!`);
                }
                if (v.smallBatteryConnected === 'no') {
                    notifications.push(`⚠️ <strong>${v.model} (${v.chassis})</strong>: Showroom aracı küçük akü <strong>bağlı değil!</strong>`);
                }
            } else if (v.location === 'parking') {
                if (bigDays > 10) {
                    notifications.push(`🚨 <strong>${v.model} (${v.chassis})</strong>: Otopark aracı büyük aküye bağlanalı <strong>${bigDays} gün (10 günü geçti)</strong>!`);
                }
            }
        }
    });

    if (notifications.length === 0) {
        area.innerHTML = `
            <div style="background: #dcfce7; color: #15803d; padding: 12px 16px; border-radius: 10px; font-size: 13px;">
                <i class="fa-solid fa-circle-check"></i> İkaz gerektiren bir araç bulunmuyor. Tüm akü durumları stabil.
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

window.openVehicleModal = function() {
    editingVehicleId = null;
    document.getElementById('modalTitle').innerText = 'Yeni Araç Ekle';
    document.getElementById('vehicleChassis').value = '';
    document.getElementById('vehicleModel').value = '';
    document.getElementById('vehicleLocation').value = 'showroom';
    document.getElementById('batteryRequired').value = 'no';
    
    document.getElementById('parkingDate').value = '';
    document.getElementById('bigBatteryDate').value = '';
    document.getElementById('smallBatteryDate').value = '';
    document.getElementById('smallBatteryConnected').value = 'yes';
    document.getElementById('vehicleNote').value = '';

    handleLocationChangeInModal();
    toggleBatteryDateInputs();

    const modal = document.getElementById('vehicleModal');
    if (modal) modal.classList.add('active');
};

window.closeVehicleModal = function() {
    const modal = document.getElementById('vehicleModal');
    if (modal) modal.classList.remove('active');
};

window.handleSaveVehicle = function() {
    const chassis = document.getElementById('vehicleChassis').value.trim();
    const model = document.getElementById('vehicleModel').value.trim();
    const location = document.getElementById('vehicleLocation').value;
    const batteryRequired = document.getElementById('batteryRequired').value;
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
        const index = vehicles.findIndex(v => v.id === editingVehicleId);
        if (index !== -1) {
            const history = vehicles[index].notesHistory || [];
            if (newNoteObj) history.unshift(newNoteObj);

            vehicles[index] = {
                ...vehicles[index],
                chassis,
                model,
                location,
                batteryRequired,
                parkingDate: location === 'parking' ? parkingDate : '',
                bigBatteryDate: batteryRequired === 'yes' ? bigBatteryDate : '',
                smallBatteryDate: (batteryRequired === 'yes' && location === 'showroom') ? smallBatteryDate : '',
                smallBatteryConnected: (batteryRequired === 'yes' && location === 'showroom') ? smallBatteryConnected : 'no',
                notesHistory: history
            };
        }
    } else {
        const history = newNoteObj ? [newNoteObj] : [{ date: timeStamp, note: 'Sisteme araç kaydı oluşturuldu.' }];
        const newVehicle = {
            id: Date.now().toString(),
            chassis,
            model,
            location,
            batteryRequired,
            parkingDate: location === 'parking' ? parkingDate : '',
            bigBatteryDate: batteryRequired === 'yes' ? bigBatteryDate : '',
            smallBatteryDate: (batteryRequired === 'yes' && location === 'showroom') ? smallBatteryDate : '',
            smallBatteryConnected: (batteryRequired === 'yes' && location === 'showroom') ? smallBatteryConnected : 'no',
            notesHistory: history
        };
        vehicles.push(newVehicle);
    }

    saveVehicles();
    render();
    closeVehicleModal();
};

window.editVehicle = function(id) {
    const vehicle = vehicles.find(v => v.id === id);
    if (!vehicle) return;

    editingVehicleId = id;
    document.getElementById('modalTitle').innerText = 'Aracı Düzenle / Tarih Güncelle';
    document.getElementById('vehicleChassis').value = vehicle.chassis;
    document.getElementById('vehicleModel').value = vehicle.model;
    document.getElementById('vehicleLocation').value = vehicle.location;
    document.getElementById('batteryRequired').value = vehicle.batteryRequired || 'no';
    
    document.getElementById('parkingDate').value = vehicle.parkingDate || '';
    document.getElementById('bigBatteryDate').value = vehicle.bigBatteryDate || '';
    document.getElementById('smallBatteryDate').value = vehicle.smallBatteryDate || '';
    document.getElementById('smallBatteryConnected').value = vehicle.smallBatteryConnected || 'yes';
    document.getElementById('vehicleNote').value = '';

    handleLocationChangeInModal();
    toggleBatteryDateInputs();

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
    document.getElementById('detailBigDate').innerText = vehicle.batteryRequired === 'yes' ? formatDateTR(vehicle.bigBatteryDate) : 'Gerekli Değil';
    document.getElementById('detailSmallDate').innerText = (vehicle.batteryRequired === 'yes' && vehicle.location === 'showroom') ? formatDateTR(vehicle.smallBatteryDate) : 'Gerekli Değil';
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

window.closeDetailModal = function() {
    const modal = document.getElementById('detailModal');
    if (modal) modal.classList.remove('active');
};

// ÖZET İŞLEM RAPORU MODALI
window.openSummaryReportModal = function() {
    const container = document.getElementById('summaryReportContent');
    if (!container) return;

    let totalNotes = 0;
    vehicles.forEach(v => totalNotes += (v.notesHistory ? v.notesHistory.length : 0));

    let html = `
        <div class="summaryReportCard">
            <h4><i class="fa-solid fa-list-check"></i> Genel Stok İstatistikleri</h4>
            <p>• Toplam Kayıtlı Araç: <strong>${vehicles.length}</strong></p>
            <p>• Showroom Araç Sayısı: <strong>${vehicles.filter(v=>v.location==='showroom').length}</strong></p>
            <p>• Otopark Araç Sayısı: <strong>${vehicles.filter(v=>v.location==='parking').length}</strong></p>
            <p>• Toplam İşlem Log Sayısı: <strong>${totalNotes}</strong></p>
        </div>
        <hr style="margin: 15px 0; border:0; border-top:1px solid #e2e8f0;">
        <h4><i class="fa-solid fa-history"></i> Tüm Araçların Detaylı İşlem Geçmişi</h4>
    `;

    vehicles.forEach(v => {
        html += `
            <div style="margin-top:12px; padding:10px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;">
                <strong style="color:var(--bmw-blue);">${v.model} (${v.chassis})</strong> - <em>${v.location.toUpperCase()}</em>
                <div style="font-size:12px; margin-top:6px;">
        `;
        if (v.notesHistory && v.notesHistory.length > 0) {
            v.notesHistory.forEach(nh => {
                html += `<div style="padding: 2px 0;">⏱️ <strong>${nh.date}:</strong> ${nh.note}</div>`;
            });
        } else {
            html += `<div>İşlem geçmişi bulunmuyor.</div>`;
        }
        html += `</div></div>`;
    });

    container.innerHTML = html;
    document.getElementById('summaryReportModal').classList.add('active');
};

window.closeSummaryReportModal = function() {
    document.getElementById('summaryReportModal').classList.remove('active');
};

// EXCEL DIŞA AKTARMA
window.exportInventoryToExcel = function() {
    if (vehicles.length === 0) {
        alert('İndirilecek araç kaydı bulunmuyor.');
        return;
    }

    const exportData = vehicles.map(v => {
        const historyText = v.notesHistory 
            ? v.notesHistory.map(h => `[${h.date}] ${h.note}`).join(' | ')
            : '-';

        return {
            "Şase No": v.chassis,
            "Marka Model": v.model,
            "Konum": v.location === 'showroom' ? 'Showroom' : 'Otopark',
            "Akü Bağlantısı Gerekli mi": v.batteryRequired === 'yes' ? 'Evet' : 'Hayır',
            "Büyük Aküye Bağlandığı Tarih": v.batteryRequired === 'yes' ? formatDateTR(v.bigBatteryDate) : 'Gerekli Değil',
            "Küçük Aküye Bağlandığı Tarih": (v.batteryRequired === 'yes' && v.location === 'showroom') ? formatDateTR(v.smallBatteryDate) : 'Gerekli Değil',
            "Eklenilen Geçmiş Notlar": historyText
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Guncel_Stok_Aku_Listesi");

    const fileName = `Inciroglu_BMW_Guncel_Stok_Aku_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
};
