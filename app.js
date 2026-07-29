/* ==========================================================================
   İNCİROĞLU BMW - AKÜ & STOK TAKİP SİSTEMİ MANTIĞI (APP.JS)
   ========================================================================== */

// --- GLOBAL UYGULAMA DURUMU (STATE) ---
let vehicles = JSON.parse(localStorage.getItem('bmw_vehicles')) || [];
let activityLogs = JSON.parse(localStorage.getItem('bmw_logs')) || [];
let currentEditId = null;
const ADMIN_PASSWORD = "admin"; // Varsayılan admin şifresi

// --- UYGULAMA BAŞLATICI ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    setTodayDateHeader();
    loadThemePreference();
    renderDashboard();
    renderTables();
    renderNotifications();
}

// Günün Tarihini Yazdır
function setTodayDateHeader() {
    const today = new Date();
    const formatted = today.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        weekday: 'long'
    });
    const dateEl = document.getElementById('todayDate');
    if (dateEl) dateEl.innerText = formatted;
}

// --- TEMA YÖNETİMİ ---
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('themeIcon');
    
    if (body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        themeIcon.className = 'fa-solid fa-moon';
        localStorage.setItem('bmw_theme', 'light');
    } else {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        themeIcon.className = 'fa-solid fa-sun';
        localStorage.setItem('bmw_theme', 'dark');
    }
}

function loadThemePreference() {
    const savedTheme = localStorage.getItem('bmw_theme') || 'light';
    const body = document.body;
    const themeIcon = document.getElementById('themeIcon');
    
    body.className = savedTheme + '-theme';
    if (themeIcon) {
        themeIcon.className = savedTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
}

// --- DASHBOARD VE SAYAÇ HESAPLAMALARI ---
function renderDashboard() {
    const totalCount = vehicles.length;
    const showroomCount = vehicles.filter(v => v.location === 'showroom').length;
    const parkingCount = vehicles.filter(v => v.location === 'parking').length;
    
    // İkazlı araç hesaplama (Showroom 30 günü aşan veya Akü Bağlı Olmayan / Otopark 10 günü aşan)
    let dangerCount = 0;
    vehicles.forEach(v => {
        if (v.location === 'showroom') {
            const daysBig = calculateDaysAgo(v.bigBatteryDate);
            if (v.batteryRequired === 'yes' && (v.smallBatteryConnected === 'no' || daysBig > 30)) {
                dangerCount++;
            }
        } else if (v.location === 'parking') {
            const daysParked = calculateDaysAgo(v.parkingDate);
            if (daysParked > 10 && (!v.bigBatteryDate || calculateDaysAgo(v.bigBatteryDate) > 10)) {
                dangerCount++;
            }
        }
    });

    document.getElementById('totalVehicle').innerText = totalCount;
    document.getElementById('showroomCount').innerText = showroomCount;
    document.getElementById('parkingCount').innerText = parkingCount;
    document.getElementById('dangerVehicle').innerText = dangerCount;
}

// --- TABLOLARI RENDER ETME ---
function renderTables() {
    const showroomTbody = document.getElementById('showroomTableBody');
    const parkingTbody = document.getElementById('parkingTableBody');

    showroomTbody.innerHTML = '';
    parkingTbody.innerHTML = '';

    const showroomList = vehicles.filter(v => v.location === 'showroom');
    const parkingList = vehicles.filter(v => v.location === 'parking');

    // Showroom Tablosu
    if (showroomList.length === 0) {
        showroomTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-secondary);">Showroomda kayıtlı araç bulunmuyor.</td></tr>`;
    } else {
        showroomList.forEach(v => {
            const daysBig = v.bigBatteryDate ? calculateDaysAgo(v.bigBatteryDate) : '-';
            const smallBadge = v.smallBatteryConnected === 'yes' 
                ? `<span class="statusBadge green"><i class="fa-solid fa-circle-check"></i> Bağlı (Yeşil)</span>`
                : `<span class="statusBadge red"><i class="fa-solid fa-circle-xmark"></i> Bağlı Değil</span>`;

            let bigBadge = `<span class="statusBadge green"><i class="fa-solid fa-circle-check"></i> Tamam</span>`;
            if (v.batteryRequired === 'no') {
                bigBadge = `<span class="statusBadge yellow"><i class="fa-solid fa-minus"></i> Gerekli Değil</span>`;
            } else if (!v.bigBatteryDate || daysBig > 30) {
                bigBadge = `<span class="statusBadge red"><i class="fa-solid fa-battery-quarter"></i> Şarj İkazı</span>`;
            }

            showroomTbody.innerHTML += `
                <tr>
                    <td><strong>${v.chassis}</strong></td>
                    <td>${v.model} <small style="color:var(--bmw-blue);">(${v.ownership.toUpperCase()})</small></td>
                    <td>${v.bigBatteryDate || '-'}</td>
                    <td>${daysBig !== '-' ? daysBig + ' Gün' : '-'}</td>
                    <td>${smallBadge}</td>
                    <td>${bigBadge}</td>
                    <td>
                        <div class="actionBtnGroup">
                            <button class="iconBtn" onclick="openDetailModal('${v.id}')" title="Notlar & Detay"><i class="fa-solid fa-eye"></i></button>
                            <button class="iconBtn" onclick="openVehicleModal('${v.id}')" title="Düzenle"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="iconBtn danger" onclick="deleteVehicle('${v.id}')" title="Sil"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
    }

    // Otopark Tablosu
    if (parkingList.length === 0) {
        parkingTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-secondary);">Otopark stokunda araç bulunmuyor.</td></tr>`;
    } else {
        parkingList.forEach(v => {
            const daysParked = v.parkingDate ? calculateDaysAgo(v.parkingDate) : 0;
            let bigBadge = `<span class="statusBadge green"><i class="fa-solid fa-check"></i> Kontrol Edildi</span>`;

            if (daysParked > 10 && (!v.bigBatteryDate || calculateDaysAgo(v.bigBatteryDate) > 10)) {
                bigBadge = `<span class="statusBadge red"><i class="fa-solid fa-triangle-exclamation"></i> 10 Gün Aşımı</span>`;
            }

            parkingTbody.innerHTML += `
                <tr>
                    <td><strong>${v.chassis}</strong></td>
                    <td>${v.model} <small style="color:var(--bmw-blue);">(${v.ownership.toUpperCase()})</small></td>
                    <td>${v.parkingDate || '-'} <small>(${daysParked} gün önce)</small></td>
                    <td>${v.bigBatteryDate || '-'}</td>
                    <td>${bigBadge}</td>
                    <td>
                        <div class="actionBtnGroup">
                            <button class="iconBtn" onclick="openDetailModal('${v.id}')" title="Notlar & Detay"><i class="fa-solid fa-eye"></i></button>
                            <button class="iconBtn" onclick="openVehicleModal('${v.id}')" title="Düzenle"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="iconBtn danger" onclick="deleteVehicle('${v.id}')" title="Sil"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        });
    }
}

// --- BİLDİRİM PANELİ ---
function renderNotifications() {
    const area = document.getElementById('notificationArea');
    area.innerHTML = '';
    let hasAlerts = false;

    vehicles.forEach(v => {
        if (v.location === 'showroom') {
            if (v.batteryRequired === 'yes' && v.smallBatteryConnected === 'no') {
                hasAlerts = true;
                area.innerHTML += `
                    <div class="notifCard">
                        <div class="notifContent">
                            <i class="fa-solid fa-triangle-exclamation" style="color:var(--status-red);"></i>
                            <div>
                                <strong>Showroom Küçük Akü İkazı:</strong> ${v.chassis} (${v.model}) küçük akü bağlantısı bağlı değil!
                            </div>
                        </div>
                        <button class="bmwBtnPrimary" style="padding:4px 10px; font-size:11px;" onclick="openVehicleModal('${v.id}')">Müdahale Et</button>
                    </div>
                `;
            }
            if (v.bigBatteryDate && calculateDaysAgo(v.bigBatteryDate) > 30) {
                hasAlerts = true;
                area.innerHTML += `
                    <div class="notifCard warning">
                        <div class="notifContent">
                            <i class="fa-solid fa-clock-rotate-left" style="color:var(--status-yellow);"></i>
                            <div>
                                <strong>Showroom Akü Şarj İkazı:</strong> ${v.chassis} (${v.model}) büyük akü takılalı 30 günden fazla oldu.
                            </div>
                        </div>
                        <button class="bmwBtnPrimary" style="padding:4px 10px; font-size:11px;" onclick="openVehicleModal('${v.id}')">Güncelle</button>
                    </div>
                `;
            }
        } else if (v.location === 'parking') {
            const daysParked = calculateDaysAgo(v.parkingDate);
            if (daysParked > 10 && (!v.bigBatteryDate || calculateDaysAgo(v.bigBatteryDate) > 10)) {
                hasAlerts = true;
                area.innerHTML += `
                    <div class="notifCard">
                        <div class="notifContent">
                            <i class="fa-solid fa-warehouse" style="color:var(--status-red);"></i>
                            <div>
                                <strong>Otopark 10 Gün İkazı:</strong> ${v.chassis} (${v.model}) otoparkta 10 gündür akü takviyesi / kontrolü bekliyor!
                            </div>
                        </div>
                        <button class="bmwBtnPrimary" style="padding:4px 10px; font-size:11px;" onclick="openVehicleModal('${v.id}')">Kontrol Et</button>
                    </div>
                `;
            }
        }
    });

    if (!hasAlerts) {
        area.innerHTML = `
            <div style="text-align:center; padding: 20px; color: var(--status-green); background: var(--status-green-bg); border-radius: 12px; font-weight:600;">
                <i class="fa-solid fa-circle-check"></i> Harika! Şu an müdahale gerektiren ikazlı araç bulunmuyor.
            </div>
        `;
    }
}

// --- MODAL İŞLEMLERİ (YENİ ARAÇ / DÜZENLE) ---
function openVehicleModal(id = null) {
    currentEditId = id;
    const modal = document.getElementById('vehicleModal');
    const modalTitle = document.getElementById('modalTitle');

    if (id) {
        const v = vehicles.find(item => item.id === id);
        if (!v) return;
        modalTitle.innerText = "Araç Bilgilerini Düzenle";
        document.getElementById('vehicleChassis').value = v.chassis;
        document.getElementById('vehicleModel').value = v.model;
        document.getElementById('vehicleOwnership').value = v.ownership;
        document.getElementById('vehicleLocation').value = v.location;
        document.getElementById('batteryRequired').value = v.batteryRequired;
        document.getElementById('parkingDate').value = v.parkingDate || '';
        document.getElementById('bigBatteryDate').value = v.bigBatteryDate || '';
        document.getElementById('smallBatteryDate').value = v.smallBatteryDate || '';
        document.getElementById('smallBatteryConnected').value = v.smallBatteryConnected || 'no';
    } else {
        modalTitle.innerText = "Yeni Araç Ekle";
        document.getElementById('vehicleChassis').value = '';
        document.getElementById('vehicleModel').value = '';
        document.getElementById('vehicleOwnership').value = 'stok';
        document.getElementById('vehicleLocation').value = 'showroom';
        document.getElementById('batteryRequired').value = 'no';
        document.getElementById('parkingDate').value = '';
        document.getElementById('bigBatteryDate').value = '';
        document.getElementById('smallBatteryDate').value = '';
        document.getElementById('smallBatteryConnected').value = 'no';
        document.getElementById('vehicleNote').value = '';
    }

    handleLocationChangeInModal();
    toggleBatteryDateInputs();
    modal.classList.add('active');
}

function closeVehicleModal() {
    document.getElementById('vehicleModal').classList.remove('active');
    currentEditId = null;
}

function handleLocationChangeInModal() {
    const loc = document.getElementById('vehicleLocation').value;
    const parkingGroup = document.getElementById('parkingDateGroup');
    const smallGroup = document.getElementById('smallBatteryDateGroup');
    const smallStatusGroup = document.getElementById('smallBatteryStatusGroup');

    if (loc === 'parking') {
        parkingGroup.classList.remove('hidden');
        smallGroup.classList.add('hidden');
        smallStatusGroup.classList.add('hidden');
    } else {
        parkingGroup.classList.add('hidden');
        smallGroup.classList.remove('hidden');
        smallStatusGroup.classList.remove('hidden');
    }
}

function toggleBatteryDateInputs() {
    const req = document.getElementById('batteryRequired').value;
    const datesWrapper = document.getElementById('batteryDatesWrapper');
    if (req === 'yes') {
        datesWrapper.classList.remove('hidden');
    } else {
        datesWrapper.classList.add('hidden');
    }
}

// Araç Kaydet / Güncelle
function handleSaveVehicle() {
    const chassis = document.getElementById('vehicleChassis').value.trim().toUpperCase();
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
        alert("Lütfen Şase No ve Araç Modelini eksiksiz giriniz.");
        return;
    }

    const now = new Date().toLocaleString('tr-TR');

    if (currentEditId) {
        // Güncelleme
        const index = vehicles.findIndex(v => v.id === currentEditId);
        if (index !== -1) {
            vehicles[index] = {
                ...vehicles[index],
                chassis,
                model,
                ownership,
                location,
                batteryRequired,
                parkingDate: location === 'parking' ? parkingDate : '',
                bigBatteryDate: batteryRequired === 'yes' ? bigBatteryDate : '',
                smallBatteryDate: (location === 'showroom' && batteryRequired === 'yes') ? smallBatteryDate : '',
                smallBatteryConnected: location === 'showroom' ? smallBatteryConnected : 'no'
            };

            if (noteText) {
                vehicles[index].notes.unshift({ date: now, text: noteText });
            }

            logActivity('GÜNCELLEME', chassis, model, `Araç bilgileri güncellendi. Konum: ${location.toUpperCase()}`);
        }
    } else {
        // Yeni Ekleme
        const newVehicle = {
            id: 'v_' + Date.now(),
            chassis,
            model,
            ownership,
            location,
            batteryRequired,
            parkingDate: location === 'parking' ? parkingDate : '',
            bigBatteryDate: batteryRequired === 'yes' ? bigBatteryDate : '',
            smallBatteryDate: (location === 'showroom' && batteryRequired === 'yes') ? smallBatteryDate : '',
            smallBatteryConnected: location === 'showroom' ? smallBatteryConnected : 'no',
            createdDate: now,
            notes: noteText ? [{ date: now, text: noteText }] : []
        };
        vehicles.push(newVehicle);
        logActivity('EKLEME', chassis, model, `Yeni araç eklendi. Konum: ${location.toUpperCase()}`);
    }

    saveData();
    closeVehicleModal();
    initApp();
}

// Araç Silme
function deleteVehicle(id) {
    const v = vehicles.find(item => item.id === id);
    if (!v) return;

    if (confirm(`${v.chassis} şase numaralı aracı silmek istediğinize emin misiniz?`)) {
        logActivity('SİLME', v.chassis, v.model, `Araç stoktan silindi.`);
        vehicles = vehicles.filter(item => item.id !== id);
        saveData();
        initApp();
    }
}

// --- DETAY & GEÇMİŞ NOTLAR MODALI ---
function openDetailModal(id) {
    const v = vehicles.find(item => item.id === id);
    if (!v) return;

    document.getElementById('detailChassis').innerText = v.chassis;
    document.getElementById('detailModel').innerText = v.model;
    document.getElementById('detailOwnership').innerText = v.ownership.toUpperCase();
    document.getElementById('detailLocation').innerText = v.location.toUpperCase();
    document.getElementById('detailBigDate').innerText = v.bigBatteryDate || '-';
    document.getElementById('detailSmallDate').innerText = v.smallBatteryDate || '-';
    document.getElementById('detailParkDate').innerText = v.parkingDate || '-';

    const notesContainer = document.getElementById('detailNotesHistory');
    notesContainer.innerHTML = '';

    if (v.notes && v.notes.length > 0) {
        v.notes.forEach(n => {
            notesContainer.innerHTML += `
                <div class="noteItem">
                    <small style="color:var(--text-secondary); display:block;">${n.date}</small>
                    <div>${n.text}</div>
                </div>
            `;
        });
    } else {
        notesContainer.innerHTML = `<div style="font-size:12px; color:var(--text-secondary);">Geçmiş not bulunmuyor.</div>`;
    }

    document.getElementById('detailModal').classList.add('active');
}

function closeDetailModal() {
    document.getElementById('detailModal').classList.remove('active');
}

// --- ÖZET İŞLEM RAPORU MODALI ---
function openSummaryReportModal() {
    const content = document.getElementById('summaryReportContent');
    content.innerHTML = '';

    if (activityLogs.length === 0) {
        content.innerHTML = `<p style="text-align:center; color:var(--text-secondary);">Henüz bir işlem kaydı oluşmadı.</p>`;
    } else {
        activityLogs.slice().reverse().forEach(log => {
            content.innerHTML += `
                <div class="noteItem" style="margin-bottom:8px;">
                    <strong style="color:var(--bmw-blue);">${log.action}</strong> - 
                    <span>${log.chassis} (${log.model})</span>
                    <small style="display:block; color:var(--text-secondary);">${log.timestamp} - ${log.details}</small>
                </div>
            `;
        });
    }

    document.getElementById('summaryReportModal').classList.add('active');
}

function closeSummaryReportModal() {
    document.getElementById('summaryReportModal').classList.remove('active');
}

// --- EXCEL RAPORU OLUŞTURMA (SHEETJS / XLSX) ---
function openExcelFilterModal() {
    document.getElementById('excelFilterModal').classList.add('active');
}

function closeExcelFilterModal() {
    document.getElementById('excelFilterModal').classList.remove('active');
}

function exportInventoryToExcelWithDates() {
    const startDate = document.getElementById('excelStartDate').value;
    const endDate = document.getElementById('excelEndDate').value;

    let filteredVehicles = vehicles;
    if (startDate && endDate) {
        filteredVehicles = vehicles.filter(v => {
            const vDate = v.createdDate ? v.createdDate.split(' ')[0] : '';
            return vDate >= startDate && vDate <= endDate;
        });
    }

    const excelData = filteredVehicles.map(v => ({
        "Şase No (VIN)": v.chassis,
        "Marka & Model": v.model,
        "Mülkiyet": v.ownership.toUpperCase(),
        "Konum": v.location.toUpperCase(),
        "Akü Bağlantısı": v.batteryRequired === 'yes' ? 'Evet' : 'Hayır',
        "Otopark Tarihi": v.parkingDate || '-',
        "Büyük Akü Tarihi": v.bigBatteryDate || '-',
        "Küçük Akü Tarihi": v.smallBatteryDate || '-',
        "Küçük Akü Durumu": v.smallBatteryConnected === 'yes' ? 'Bağlı' : 'Bağlı Değil',
        "Kayıt Tarihi": v.createdDate || '-'
    }));

    if (excelData.length === 0) {
        alert("Seçilen tarih aralığında aktarılacak veri bulunamadı.");
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Akü Stok Raporu");
    XLSX.writeFile(workbook, `Inciroglu_BMW_Aku_Stok_Raporu_${new Date().toISOString().slice(0,10)}.xlsx`);

    closeExcelFilterModal();
}

// --- ADMIN İŞLEMLERİ & YEDEKLEME ---
function openAdminLoginModal() {
    document.getElementById('adminPasswordInput').value = '';
    document.getElementById('adminLoginModal').classList.add('active');
}

function closeAdminLoginModal() {
    document.getElementById('adminLoginModal').classList.remove('active');
}

function handleAdminLogin() {
    const pass = document.getElementById('adminPasswordInput').value;
    if (pass === ADMIN_PASSWORD) {
        closeAdminLoginModal();
        document.getElementById('adminPanelModal').classList.add('active');
    } else {
        alert("Hatalı yönetici şifresi!");
    }
}

function closeAdminPanelModal() {
    document.getElementById('adminPanelModal').classList.remove('active');
}

function downloadBackupJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ vehicles, activityLogs }));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `BMW_Aku_Sistemi_Yedek_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function uploadBackupJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if (parsed.vehicles) vehicles = parsed.vehicles;
            if (parsed.activityLogs) activityLogs = parsed.activityLogs;
            saveData();
            initApp();
            alert("Yedek başarıyla yüklendi ve veriler güncellendi!");
            closeAdminPanelModal();
        } catch (err) {
            alert("Geçersiz yedek dosyası!");
        }
    };
    reader.readAsText(file);
}

function resetAllData() {
    if (confirm("TÜM VERİLER VE İŞLEM LOGLARI KALICI OLARAK SİLİNECEKTİR! Emin misiniz?")) {
        vehicles = [];
        activityLogs = [];
        saveData();
        initApp();
        alert("Sistem başarıyla sıfırlandı.");
        closeAdminPanelModal();
    }
}

// --- YARDIMCI VE YEREL DEPOLAMA FONKSİYONLARI ---
function calculateDaysAgo(dateString) {
    if (!dateString) return 0;
    const diffTime = Math.abs(new Date() - new Date(dateString));
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function logActivity(action, chassis, model, details) {
    const log = {
        id: 'log_' + Date.now(),
        timestamp: new Date().toLocaleString('tr-TR'),
        action,
        chassis,
        model,
        details
    };
    activityLogs.push(log);
    localStorage.setItem('bmw_logs', JSON.stringify(activityLogs));
}

function saveData() {
    localStorage.setItem('bmw_vehicles', JSON.stringify(vehicles));
    localStorage.setItem('bmw_logs', JSON.stringify(activityLogs));
}
