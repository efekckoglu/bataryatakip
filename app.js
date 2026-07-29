/* ==========================================================================
   İnciroğlu BMW | Stok & Akü Takip JS Engine (Admin & Tema Destekli)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

const defaultVehicles = [
    {
        id: '1',
        chassis: 'WBA11AB000XXXX123',
        model: 'BMW i4 M50',
        ownership: 'stok',
        location: 'showroom',
        batteryRequired: 'yes',
        bigBatteryDate: getDaysAgoDate(6),
        smallBatteryDate: getDaysAgoDate(2),
        smallBatteryConnected: 'yes',
        parkingDate: '',
        isDeleted: false,
        notesHistory: [
            { id: 'n1', date: '28.07.2026 09:00', rawDate: '2026-07-28', note: 'Showroom sergi alanına alındı.' },
            { id: 'n2', date: '28.07.2026 14:20', rawDate: '2026-07-28', note: 'Büyük akü şarja bağlandı.' }
        ]
    }
];

let vehicles = [];
let editingVehicleId = null;
let isAdminLoggedIn = false;

function initApp() {
    loadTheme();
    loadVehicles();
    updateTodayDate();
    render();
}

/* TEMA İŞLEMLERİ (KOYU / BEYAZ) */
function loadTheme() {
    const savedTheme = localStorage.getItem('inciroglu_theme') || 'light';
    const body = document.getElementById('appBody');
    const icon = document.getElementById('themeIcon');
    
    if (savedTheme === 'dark') {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        if (icon) icon.className = 'fa-solid fa-sun';
    } else {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        if (icon) icon.className = 'fa-solid fa-moon';
    }
}

window.toggleTheme = function() {
    const body = document.getElementById('appBody');
    const icon = document.getElementById('themeIcon');
    
    if (body.classList.contains('light-theme')) {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        if (icon) icon.className = 'fa-solid fa-sun';
        localStorage.setItem('inciroglu_theme', 'dark');
    } else {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        if (icon) icon.className = 'fa-solid fa-moon';
        localStorage.setItem('inciroglu_theme', 'light');
    }
};

/* YARDIMCI TARIH VE FORMAT FONKSİYONLARI */
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

function getCurrentISOShortDate() {
    return new Date().toISOString().split('T')[0];
}

function loadVehicles() {
    const saved = localStorage.getItem('inciroglu_bmw_v6_vehicles');
    if (saved) {
        try { vehicles = JSON.parse(saved); } catch (e) { vehicles = defaultVehicles; }
    } else {
        vehicles = defaultVehicles;
        saveVehicles();
    }
}

function saveVehicles() {
    localStorage.setItem('inciroglu_bmw_v6_vehicles', JSON.stringify(vehicles));
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

function renderShowroomTable() {
    const body = document.getElementById('showroomTableBody');
    if (!body) return;
    body.innerHTML = '';

    const showroomVehicles = vehicles.filter(v => v.location === 'showroom' && !v.isDeleted);

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

function renderParkingTable() {
    const body = document.getElementById('parkingTableBody');
    if (!body) return;
    body.innerHTML = '';

    const parkingVehicles = vehicles.filter(v => v.location === 'parking' && !v.isDeleted);

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
    const activeVehicles = vehicles.filter(v => !v.isDeleted);
    const total = activeVehicles.length;
    const showroom = activeVehicles.filter(v => v.location === 'showroom').length;
    const parking = activeVehicles.filter(v => v.location === 'parking').length;

    let dangerCount = 0;
    activeVehicles.forEach(v => {
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

function renderNotifications() {
    const area = document.getElementById('notificationArea');
    if (!area) return;
    area.innerHTML = '';

    const notifications = [];

    vehicles.filter(v => !v.isDeleted).forEach(v => {
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
            <div style="background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 12px 16px; border-radius: 10px; font-size: 13px;">
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
    document.getElementById('vehicleOwnership').value = 'stok';
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
    const ownership = document.getElementById('vehicleOwnership').value;
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
    const rawDate = getCurrentISOShortDate();
    const newNoteObj = noteText ? { id: Date.now().toString(), date: timeStamp, rawDate: rawDate, note: noteText } : null;

    if (editingVehicleId) {
        const index = vehicles.findIndex(v => v.id === editingVehicleId);
        if (index !== -1) {
            const history = vehicles[index].notesHistory || [];
            if (newNoteObj) history.unshift(newNoteObj);

            vehicles[index] = {
                ...vehicles[index],
                chassis,
                model,
                ownership,
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
        const history = newNoteObj 
            ? [newNoteObj] 
            : [{ id: Date.now().toString(), date: timeStamp, rawDate: rawDate, note: 'Sisteme yeni araç kaydı oluşturuldu.' }];

        const newVehicle = {
            id: Date.now().toString(),
            chassis,
            model,
            ownership,
            location,
            batteryRequired,
            parkingDate: location === 'parking' ? parkingDate : '',
            bigBatteryDate: batteryRequired === 'yes' ? bigBatteryDate : '',
            smallBatteryDate: (batteryRequired === 'yes' && location === 'showroom') ? smallBatteryDate : '',
            smallBatteryConnected: (batteryRequired === 'yes' && location === 'showroom') ? smallBatteryConnected : 'no',
            isDeleted: false,
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
    document.getElementById('vehicleOwnership').value = vehicle.ownership || 'stok';
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

    if (confirm(`${vehicle.model} (${vehicle.chassis}) silinecek. Özet raporda [SİLİNDİ] olarak saklanacaktır.`)) {
        vehicle.isDeleted = true;
        
        const timeStamp = getCurrentDateTimeFormatted();
        const rawDate = getCurrentISOShortDate();
        
        if (!vehicle.notesHistory) vehicle.notesHistory = [];
        vehicle.notesHistory.unshift({
            id: Date.now().toString(),
            date: timeStamp,
            rawDate: rawDate,
            note: '🚨 [SİSTEM SİLME İŞLEMİ] Araç aktif stok listesinden kaldırıldı.'
        });

        saveVehicles();
        render();
    }
};

window.openDetailModal = function(id) {
    const vehicle = vehicles.find(v => v.id === id);
    if (!vehicle) return;

    document.getElementById('detailChassis').innerText = vehicle.chassis;
    document.getElementById('detailModel').innerText = vehicle.model;
    document.getElementById('detailOwnership').innerText = (vehicle.ownership === 'konsinye') ? 'Konsinye Araç' : 'Stok Aracı';
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

window.openSummaryReportModal = function() {
    const container = document.getElementById('summaryReportContent');
    if (!container) return;

    let totalNotes = 0;
    vehicles.forEach(v => totalNotes += (v.notesHistory ? v.notesHistory.length : 0));

    const activeCount = vehicles.filter(v => !v.isDeleted).length;
    const deletedCount = vehicles.filter(v => v.isDeleted).length;

    let html = `
        <div class="summaryReportCard">
            <h4><i class="fa-solid fa-list-check"></i> Sistem Bütünsel Log İstatistikleri</h4>
            <p>• Aktif Stok Sayısı: <strong>${activeCount}</strong></p>
            <p>• Silinen / Arşivdeki Araç Sayısı: <strong>${deletedCount}</strong></p>
            <p>• Sistemde Kayıtlı Toplam İşlem Log Sayısı: <strong>${totalNotes}</strong></p>
        </div>
        <hr style="margin: 15px 0; border:0; border-top:1px solid var(--border-color);">
        <h4><i class="fa-solid fa-history"></i> Bütün Araç Geçmişi & Yapılan İşlemler</h4>
    `;

    vehicles.forEach(v => {
        const deletedBadge = v.isDeleted 
            ? `<span style="background:rgba(225, 29, 72, 0.15); color:#e11d48; font-size:11px; padding:2px 6px; border-radius:4px; margin-left:6px;">SİLİNDİ</span>` 
            : `<span style="background:rgba(16, 185, 129, 0.15); color:#10b981; font-size:11px; padding:2px 6px; border-radius:4px; margin-left:6px;">AKTİF</span>`;

        const ownershipBadge = (v.ownership === 'konsinye') ? ' [KONSİNYE]' : ' [STOK]';

        html += `
            <div style="margin-top:12px; padding:10px; background:var(--bg-main); border-radius:8px; border:1px solid var(--border-color);">
                <strong style="color:var(--bmw-blue);">${v.model} (${v.chassis})</strong> ${ownershipBadge} - <em>${v.location.toUpperCase()}</em> ${deletedBadge}
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

/* EXCEL MODAL İŞLEMLERİ */
window.openExcelFilterModal = function() {
    const today = getCurrentISOShortDate();
    document.getElementById('excelStartDate').value = getDaysAgoDate(30);
    document.getElementById('excelEndDate').value = today;
    document.getElementById('excelFilterModal').classList.add('active');
};

window.closeExcelFilterModal = function() {
    document.getElementById('excelFilterModal').classList.remove('active');
};

window.exportInventoryToExcelWithDates = function() {
    const startDate = document.getElementById('excelStartDate').value;
    const endDate = document.getElementById('excelEndDate').value;

    if (!startDate || !endDate) {
        alert('Lütfen geçerli bir tarih aralığı seçiniz.');
        return;
    }

    const exportRows = [];

    vehicles.forEach(v => {
        const historyList = v.notesHistory || [];
        const filteredLogs = historyList.filter(h => {
            if (!h.rawDate) return true;
            return h.rawDate >= startDate && h.rawDate <= endDate;
        });

        if (filteredLogs.length > 0) {
            const logsCombined = filteredLogs.map(l => `[${l.date}] ${l.note}`).join(' || ');

            exportRows.push({
                "Şase No (VIN)": v.chassis,
                "Marka Model": v.model,
                "Mülkiyet Durumu": (v.ownership === 'konsinye') ? 'Konsinye' : 'Stok',
                "Sistem Durumu": v.isDeleted ? 'SİLİNDİ / ARŞİV' : 'AKTİF STOK',
                "Son Konum": v.location === 'showroom' ? 'Showroom' : 'Otopark',
                "Akü Bağlantı Gerekli mi": v.batteryRequired === 'yes' ? 'Evet' : 'Hayır',
                "Büyük Akü Tarihi": v.batteryRequired === 'yes' ? formatDateTR(v.bigBatteryDate) : 'Gerekli Değil',
                "Tarih Aralığındaki İşlem Logları": logsCombined
            });
        }
    });

    if (exportRows.length === 0) {
        alert('Seçilen tarih aralığında herhangi bir araç işlem kaydı bulunamadı.');
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Islem_Raporu");

    const fileName = `Inciroglu_BMW_Detayli_Rapor_${startDate}_ile_${endDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    closeExcelFilterModal();
};

/* ==========================================================================
   ADMIN PANELİ MANTIĞI & KALICI SİLME YÖNETİMİ
   ========================================================================== */

window.openAdminModal = function() {
    document.getElementById('adminModal').classList.add('active');
    if (isAdminLoggedIn) {
        document.getElementById('adminLoginForm').classList.add('hidden');
        document.getElementById('adminDashboard').classList.remove('hidden');
        renderAdminDeletedList();
    } else {
        document.getElementById('adminLoginForm').classList.remove('hidden');
        document.getElementById('adminDashboard').classList.add('hidden');
    }
};

window.closeAdminModal = function() {
    document.getElementById('adminModal').classList.remove('active');
};

window.handleAdminLogin = function() {
    const password = document.getElementById('adminPasswordInput').value;
    if (password === 'admin123') { // Varsayılan Şifre
        isAdminLoggedIn = true;
        document.getElementById('adminPasswordInput').value = '';
        document.getElementById('adminLoginForm').classList.add('hidden');
        document.getElementById('adminDashboard').classList.remove('hidden');
        renderAdminDeletedList();
    } else {
        alert('Hatalı Admin Şifresi! (Varsayılan: admin123)');
    }
};

window.handleAdminLogout = function() {
    isAdminLoggedIn = false;
    document.getElementById('adminLoginForm').classList.remove('hidden');
    document.getElementById('adminDashboard').classList.add('hidden');
};

function renderAdminDeletedList() {
    const container = document.getElementById('adminDeletedVehiclesList');
    if (!container) return;

    const deletedVehicles = vehicles.filter(v => v.isDeleted);

    if (deletedVehicles.length === 0) {
        container.innerHTML = `<div style="padding:10px; color:var(--text-muted); font-size:12px;">Silinmiş araç veya işlem kaydı bulunmuyor.</div>`;
        return;
    }

    let html = '';
    deletedVehicles.forEach(v => {
        html += `
            <div class="adminLogItem">
                <div>
                    <strong>${v.model} (${v.chassis})</strong>
                    <div style="font-size:11px; color:var(--text-muted);">Mülkiyet: ${v.ownership.toUpperCase()} | Konum: ${v.location.toUpperCase()}</div>
                </div>
                <button class="cancelButton" style="color:#ef4444; border-color:#fca5a5; font-size:11px;" onclick="permanentlyDeleteVehicle('${v.id}')">
                    <i class="fa-solid fa-trash-can"></i> Tamamen Sil (Kalıcı)
                </button>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ADMIN YETKİSİYLE KALICI SİLME
window.permanentlyDeleteVehicle = function(id) {
    if (confirm('Bu araç ve ona ait tüm özet rapor notları KALICI OLARAK veritabanından silinecektir. Emin misiniz?')) {
        vehicles = vehicles.filter(v => v.id !== id);
        saveVehicles();
        render();
        renderAdminDeletedList();
    }
};

// ADMIN YEDEK ALMA VE SIFIRLAMA
window.exportSystemBackupJSON = function() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(vehicles, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Inciroglu_BMW_Sistem_Yedegi_${getCurrentISOShortDate()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
};

window.clearAllData = function() {
    if (confirm('DİKKAT! Sistemdeki TÜM araçlar, geçmiş notlar ve loglar tamamen silinecektir. Devam edilsin mi?')) {
        vehicles = [];
        saveVehicles();
        render();
        renderAdminDeletedList();
        alert('Sistem tamamen sıfırlandı.');
    }
};
