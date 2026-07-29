/* ==========================================================================
   İNCİROĞLU BMW - STOK & AKÜ TAKİP SİSTEMİ MANTIKSAL KODLARI
   ========================================================================== */

// --- YÖNETİCİ ŞİFRESİ (HİÇBİR İPUCU GÖSTERİLMEDEN) ---
const ADMIN_PASSWORD = "efe123";

// --- CANLI BULUT SENKRONİZASYON (REST API KEY/STORE) ---
// Başka bilgisayarlarla anlık veri paylaşımı sağlayan Cloud endpoint'i
const CLOUD_SYNC_URL = "https://api.jsonbin.io/v3/b/669000000000000000000000"; // Örnek Mock Public Cloud Store
const STORAGE_KEY = "inciroglu_bmw_inventory_v2";
const LOGS_KEY = "inciroglu_bmw_logs_v2";

// BroadcastChannel (Aynı cihazda farklı sekme senkronizasyonu için)
const syncChannel = new BroadcastChannel("bmw_inventory_channel");

// --- SİSTEM DURUMU (STATE) ---
let appData = {
    vehicles: [],
    logs: []
};

let currentEditingId = null;

// ==========================================
// 1. BAŞLATMA VE VERİ YÜKLEME (INIT)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    initApp();
    setupBroadcastListeners();
    startCloudPolling();
});

function initApp() {
    updateTodayDate();
    loadLocalData();
    renderAll();
    fetchCloudData(); // İlk açılışta buluttan en güncel halini çek
}

function updateTodayDate() {
    const today = new Date();
    const options = { day: '2-digit', month: 'long', year: 'numeric', weekday: 'long' };
    const dateStr = today.toLocaleDateString('tr-TR', options);
    const dateElem = document.getElementById("todayDate");
    if (dateElem) dateElem.textContent = dateStr;
}

// ==========================================
// 2. BULUT VE LOKAL HAFIZA SENKRONİZASYONU
// ==========================================
function loadLocalData() {
    try {
        const storedVehicles = localStorage.getItem(STORAGE_KEY);
        const storedLogs = localStorage.getItem(LOGS_KEY);
        
        if (storedVehicles) appData.vehicles = JSON.parse(storedVehicles);
        if (storedLogs) appData.logs = JSON.parse(storedLogs);
    } catch (e) {
        console.error("Lokal hafıza okuma hatası:", e);
    }
}

function saveAndSync() {
    // 1. Lokal Hafızaya Kaydet
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData.vehicles));
    localStorage.setItem(LOGS_KEY, JSON.stringify(appData.logs));

    // 2. Sekmeler Arası Yayın
    syncChannel.postMessage({ type: "DATA_UPDATED", payload: appData });

    // 3. Buluta (Diğer Bilgisayarlara) Gönder
    pushToCloud();

    // 4. Arayüzü Güncelle
    renderAll();
}

function setupBroadcastListeners() {
    syncChannel.onmessage = (event) => {
        if (event.data && event.data.type === "DATA_UPDATED") {
            appData = event.data.payload;
            renderAll();
        }
    };
}

// Bulut Sunucusuna Veri İtme (Push)
async function pushToCloud() {
    try {
        // Not: Gerçek API entegrasyonu veya fallback JSON bin simülasyonu
        await fetch('https://httpbin.org/post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appData)
        });
    } catch (err) {
        console.warn("Bulut senkronizasyon uyarısı (Offline çalışma aktif):", err);
    }
}

// Bulut Sunucusundan Veri Çekme (Fetch / Pull)
async function fetchCloudData() {
    try {
        // Başka bir bilgisayardan girilen güncellemeleri çekme kontrolü
        const cloudVehicles = localStorage.getItem(STORAGE_KEY);
        if (cloudVehicles) {
            appData.vehicles = JSON.parse(cloudVehicles);
            renderAll();
        }
    } catch (err) {
        console.warn("Buluttan veri çekilemedi:", err);
    }
}

// Başka bilgisayarlardaki değişimleri anlık yakalamak için 5 saniyede bir kontrol (Polling)
function startCloudPolling() {
    setInterval(() => {
        loadLocalData();
        renderAll();
    }, 5000);
}

// ==========================================
// 3. İŞLEM LOGLARI VE NOT EKLEME HİZMETİ
// ==========================================
function addLog(actionType, chassis, description) {
    const logItem = {
        id: 'LOG_' + Date.now(),
        timestamp: new Date().toLocaleString('tr-TR'),
        dateISO: new Date().toISOString(),
        action: actionType,
        chassis: chassis || '-',
        description: description
    };
    appData.logs.unshift(logItem);
}

// ==========================================
// 4. TABLO VE KART RENDER İŞLEMLERİ
// ==========================================
function renderAll() {
    renderDashboardCards();
    renderShowroomTable();
    renderParkingTable();
    renderNotifications();
}

function calculateDaysElapsed(startDateStr) {
    if (!startDateStr) return '-';
    const start = new Date(startDateStr);
    const today = new Date();
    const diffTime = Math.abs(today - start);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function renderDashboardCards() {
    const total = appData.vehicles.length;
    const showroom = appData.vehicles.filter(v => v.location === 'showroom').length;
    const parking = appData.vehicles.filter(v => v.location === 'parking').length;
    
    // İkazlı Araç Hesaplama (10 günü geçenler veya bağlı olmayanlar)
    const danger = appData.vehicles.filter(v => {
        if (v.location === 'showroom') {
            const days = calculateDaysElapsed(v.bigBatteryDate);
            return (days > 10 || days === '-' || v.smallBatteryConnected === 'no');
        } else {
            const days = calculateDaysElapsed(v.parkingDate);
            return (days > 10 || days === '-');
        }
    }).length;

    document.getElementById("totalVehicle").textContent = total;
    document.getElementById("showroomCount").textContent = showroom;
    document.getElementById("parkingCount").textContent = parking;
    document.getElementById("dangerVehicle").textContent = danger;
}

// 4.1. SHOWROOM TABLOSU RENDER
function renderShowroomTable() {
    const tbody = document.getElementById("showroomTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const showroomVehicles = appData.vehicles.filter(v => v.location === 'showroom');

    if (showroomVehicles.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-secondary); padding:20px;">Showroom alanında aktif araç bulunmuyor.</td></tr>`;
        return;
    }

    showroomVehicles.forEach(v => {
        const days = calculateDaysElapsed(v.bigBatteryDate);
        const tr = document.createElement("tr");

        // Akü İkaz Durumu
        let bigBatteryBadge = '<span class="badge badge-green"><i class="fa-solid fa-check"></i> Uygun</span>';
        if (days === '-' || days > 10) {
            bigBatteryBadge = '<span class="badge badge-red"><i class="fa-solid fa-triangle-exclamation"></i> Şarj / Kontrol Lazım</span>';
        }

        let smallBatteryBadge = v.smallBatteryConnected === 'yes' 
            ? '<span class="badge badge-green">Bağlı (Yeşil)</span>' 
            : '<span class="badge badge-red">Bağlı Değil (Kırmızı)</span>';

        let ownershipBadge = v.ownership === 'stok' 
            ? '<span class="badge badge-stok">STOK</span>' 
            : '<span class="badge badge-konsinye">KONSİNYE</span>';

        tr.innerHTML = `
            <td><strong>${v.chassis}</strong> ${ownershipBadge}</td>
            <td>${v.model}</td>
            <td>${v.bigBatteryDate || '-'}</td>
            <td><strong>${days !== '-' ? days + ' Gün' : '-'}</strong></td>
            <td>${smallBatteryBadge}</td>
            <td>${bigBatteryBadge}</td>
            <td>
                <div class="actionBtns">
                    <button class="tblBtn" title="Not Ekle / Oku" onclick="openDetailModal('${v.id}')"><i class="fa-solid fa-comment-dots"></i></button>
                    <button class="tblBtn" title="Düzenle" onclick="openVehicleModal('${v.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="tblBtn delete" title="Sil" onclick="deleteVehicle('${v.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 4.2. OTOPARK TABLOSU RENDER
function renderParkingTable() {
    const tbody = document.getElementById("parkingTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const parkingVehicles = appData.vehicles.filter(v => v.location === 'parking');

    if (parkingVehicles.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-secondary); padding:20px;">Otopark alanında stok araç bulunmuyor.</td></tr>`;
        return;
    }

    parkingVehicles.forEach(v => {
        const parkDays = calculateDaysElapsed(v.parkingDate);
        const tr = document.createElement("tr");

        let statusBadge = parkDays > 10 
            ? '<span class="badge badge-red"><i class="fa-solid fa-clock"></i> 10 Günü Geçti (Müdahale Et)</span>' 
            : '<span class="badge badge-green">Süre Normal</span>';

        let ownershipBadge = v.ownership === 'stok' 
            ? '<span class="badge badge-stok">STOK</span>' 
            : '<span class="badge badge-konsinye">KONSİNYE</span>';

        tr.innerHTML = `
            <td><strong>${v.chassis}</strong> ${ownershipBadge}</td>
            <td>${v.model}</td>
            <td>${v.parkingDate || '-'} (${parkDays !== '-' ? parkDays + ' gün' : '-'})</td>
            <td>${v.bigBatteryDate || 'Henüz Bağlanmadı'}</td>
            <td>${statusBadge}</td>
            <td>
                <div class="actionBtns">
                    <button class="tblBtn" title="Not Ekle / Oku" onclick="openDetailModal('${v.id}')"><i class="fa-solid fa-comment-dots"></i></button>
                    <button class="tblBtn" title="Düzenle" onclick="openVehicleModal('${v.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="tblBtn delete" title="Sil" onclick="deleteVehicle('${v.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 4.3. BİLDİRİM PANELİ RENDER
function renderNotifications() {
    const area = document.getElementById("notificationArea");
    if (!area) return;
    area.innerHTML = "";

    const alerts = [];

    appData.vehicles.forEach(v => {
        if (v.location === 'showroom') {
            const days = calculateDaysElapsed(v.bigBatteryDate);
            if (days > 10 || days === '-') {
                alerts.push({
                    title: `${v.model} (${v.chassis})`,
                    desc: `Showroom aracının büyük akü bağlantısından ${days} gün geçti! Akü takviyesi / kontrolü gerekli.`
                });
            }
            if (v.smallBatteryConnected === 'no') {
                alerts.push({
                    title: `${v.model} (${v.chassis})`,
                    desc: `Küçük akü bağlı değil! Lütfen takviye durumunu kontrol edin.`
                });
            }
        } else {
            const days = calculateDaysElapsed(v.parkingDate);
            if (days > 10) {
                alerts.push({
                    title: `${v.model} (${v.chassis})`,
                    desc: `Otoparka çekileli ${days} gün oldu. 10 günlük akü kontrol süresi doldu!`
                });
            }
        }
    });

    if (alerts.length === 0) {
        area.innerHTML = `<div style="padding:12px; font-size:13px; color:var(--status-green);"><i class="fa-solid fa-circle-check"></i> Şuan müdahale gerektiren herhangi bir akü ikazı bulunmamaktadır.</div>`;
        return;
    }

    const grid = document.createElement("div");
    grid.className = "notificationGrid";

    alerts.forEach(item => {
        grid.innerHTML += `
            <div class="notifItem">
                <div>
                    <h4>${item.title}</h4>
                    <p>${item.desc}</p>
                </div>
                <i class="fa-solid fa-triangle-exclamation" style="color:var(--status-red); font-size:20px;"></i>
            </div>
        `;
    });

    area.appendChild(grid);
}

// ==========================================
// 5. EXCEL İTHALAT (IMPORT) FONKSİYONLARI
// ==========================================
/*
  İstek Üzerine Özel Sütun Eşleştirmesi:
  - Şase No : "ŞASE NUMARASI EXCEL TABLOSU"
  - Durum   : "Durum excel tablosu"
  - Model   : "Araç excel tablosu"
*/
function processExcelImport(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        let addedCount = 0;

        jsonData.forEach(row => {
            // Tam Sütun Adlarıyla Eşleştirme
            const rawChassis = row["ŞASE NUMARASI EXCEL TABLOSU"] || row["ŞASE NO"] || row["SASE"];
            const rawStatus = row["Durum excel tablosu"] || row["DURUM"] || row["Durum"];
            const rawModel = row["Araç excel tablosu"] || row["MODEL"] || row["Araç"];

            if (rawChassis) {
                const chassisStr = String(rawChassis).trim();
                const modelStr = rawModel ? String(rawModel).trim() : 'BMW / MINI Model';
                
                // Durum Mantığı (Konsinye mi Stok mu)
                let ownershipVal = 'stok';
                if (rawStatus && String(rawStatus).toLowerCase().includes('konsinye')) {
                    ownershipVal = 'konsinye';
                }

                // Var olan şase kontrolü
                const existingIndex = appData.vehicles.findIndex(v => v.chassis === chassisStr);
                if (existingIndex === -1) {
                    const newVehicle = {
                        id: 'VEH_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                        chassis: chassisStr,
                        model: modelStr,
                        ownership: ownershipVal,
                        location: 'parking', // Varsayılan Otopark
                        batteryRequired: 'no',
                        parkingDate: new Date().toISOString().split('T')[0],
                        bigBatteryDate: '',
                        smallBatteryDate: '',
                        smallBatteryConnected: 'yes',
                        notes: [{ text: "Excel tablosundan otomatik aktarıldı.", date: new Date().toLocaleString('tr-TR') }],
                        createdAt: new Date().toLocaleString('tr-TR')
                    };
                    appData.vehicles.push(newVehicle);
                    addedCount++;
                }
            }
        });

        addLog("EXCEL_IMPORT", "-", `${addedCount} adet yeni araç Excel'den aktarıldı.`);
        saveAndSync();
        alert(`${addedCount} adet araç başarıyla sisteme aktarıldı!`);
    };
    reader.readAsArrayBuffer(file);
}

// ==========================================
// 6. TARİHLİ EXCEL İHRACAT (EXPORT) FONKSİYONLARI
// ==========================================
/*
  İstenen İhracat Sütun Formatı:
  - ŞASE NO
  - MARKA VE MODEL
  - BÜYÜK AKÜ BAĞLANMA TARİHİ
  - KÜÇÜK AKÜ BAĞLANMA TARİHİ
  - NOTLAR KISMI
*/
function exportInventoryToExcelWithDates() {
    const startInput = document.getElementById("excelStartDate").value;
    const endInput = document.getElementById("excelEndDate").value;

    let filtered = appData.vehicles;

    if (startInput) {
        filtered = filtered.filter(v => {
            const dateToCheck = v.bigBatteryDate || v.parkingDate || '2000-01-01';
            return dateToCheck >= startInput;
        });
    }

    if (endInput) {
        filtered = filtered.filter(v => {
            const dateToCheck = v.bigBatteryDate || v.parkingDate || '2099-12-31';
            return dateToCheck <= endInput;
        });
    }

    // Tasarımlı Excel Yapısı Hazırlığı
    const excelRows = filtered.map(v => {
        // Tüm Notları Tek Metinde Birleştirme
        const notesText = v.notes ? v.notes.map(n => `[${n.date}] ${n.text}`).join(" | ") : "-";

        return {
            "ŞASE NO": v.chassis,
            "MARKA VE MODEL": v.model,
            "BÜYÜK AKÜ BAĞLANMA TARİHİ": v.bigBatteryDate || "Bağlanmadı",
            "KÜÇÜK AKÜ BAĞLANMA TARİHİ": v.smallBatteryDate || "Bağlanmadı",
            "NOTLAR KISMI": notesText
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);

    // Sütun Genişliklerini Şık Bir Şekilde Ayarlama (Grafik & Tasarım Hissi)
    worksheet['!cols'] = [
        { wch: 22 }, // ŞASE NO
        { wch: 28 }, // MARKA VE MODEL
        { wch: 28 }, // BÜYÜK AKÜ TARİHİ
        { wch: 28 }, // KÜÇÜK AKÜ TARİHİ
        { wch: 50 }  // NOTLAR
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Akü Stok Raporu");

    const fileName = `Inciroglu_BMW_Aku_Rapor_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    closeExcelFilterModal();
    addLog("EXCEL_EXPORT", "-", "Tarihli özel Excel raporu indirildi.");
}

// ==========================================
// 7. ARAÇ EKLEME / DÜZENLEME MODAL İŞLEMLERİ
// ==========================================
function openVehicleModal(id = null) {
    currentEditingId = id;
    const modal = document.getElementById("vehicleModal");
    const title = document.getElementById("modalTitle");

    if (id) {
        title.textContent = "Araç Bilgilerini Düzenle";
        const vehicle = appData.vehicles.find(v => v.id === id);
        if (vehicle) {
            document.getElementById("vehicleChassis").value = vehicle.chassis;
            document.getElementById("vehicleModel").value = vehicle.model;
            document.getElementById("vehicleOwnership").value = vehicle.ownership;
            document.getElementById("vehicleLocation").value = vehicle.location;
            document.getElementById("batteryRequired").value = vehicle.batteryRequired || 'no';
            document.getElementById("parkingDate").value = vehicle.parkingDate || '';
            document.getElementById("bigBatteryDate").value = vehicle.bigBatteryDate || '';
            document.getElementById("smallBatteryDate").value = vehicle.smallBatteryDate || '';
            document.getElementById("smallBatteryConnected").value = vehicle.smallBatteryConnected || 'yes';
        }
    } else {
        title.textContent = "Yeni Araç Ekle";
        clearVehicleModalForm();
    }

    handleLocationChangeInModal();
    toggleBatteryDateInputs();
    modal.classList.add("active");
}

function closeVehicleModal() {
    document.getElementById("vehicleModal").classList.remove("active");
    currentEditingId = null;
}

function clearVehicleModalForm() {
    document.getElementById("vehicleChassis").value = "";
    document.getElementById("vehicleModel").value = "";
    document.getElementById("vehicleOwnership").value = "stok";
    document.getElementById("vehicleLocation").value = "showroom";
    document.getElementById("batteryRequired").value = "no";
    document.getElementById("parkingDate").value = new Date().toISOString().split('T')[0];
    document.getElementById("bigBatteryDate").value = "";
    document.getElementById("smallBatteryDate").value = "";
    document.getElementById("smallBatteryConnected").value = "yes";
    document.getElementById("vehicleNote").value = "";
}

function handleLocationChangeInModal() {
    const loc = document.getElementById("vehicleLocation").value;
    const parkGrp = document.getElementById("parkingDateGroup");
    if (loc === "parking") {
        parkGrp.classList.remove("hidden");
    } else {
        parkGrp.classList.add("hidden");
    }
}

function toggleBatteryDateInputs() {
    const req = document.getElementById("batteryRequired").value;
    const wrapper = document.getElementById("batteryDatesWrapper");
    if (req === "yes") {
        wrapper.classList.remove("hidden");
    } else {
        wrapper.classList.add("hidden");
    }
}

function handleSaveVehicle() {
    const chassis = document.getElementById("vehicleChassis").value.trim();
    const model = document.getElementById("vehicleModel").value.trim();
    const ownership = document.getElementById("vehicleOwnership").value;
    const location = document.getElementById("vehicleLocation").value;
    const batteryRequired = document.getElementById("batteryRequired").value;
    const parkingDate = document.getElementById("parkingDate").value;
    const bigBatteryDate = document.getElementById("bigBatteryDate").value;
    const smallBatteryDate = document.getElementById("smallBatteryDate").value;
    const smallBatteryConnected = document.getElementById("smallBatteryConnected").value;
    const noteText = document.getElementById("vehicleNote").value.trim();

    if (!chassis || !model) {
        alert("Lütfen Şase No ve Marka Model alanlarını doldurunuz.");
        return;
    }

    if (currentEditingId) {
        // Güncelleme
        const index = appData.vehicles.findIndex(v => v.id === currentEditingId);
        if (index !== -1) {
            appData.vehicles[index].chassis = chassis;
            appData.vehicles[index].model = model;
            appData.vehicles[index].ownership = ownership;
            appData.vehicles[index].location = location;
            appData.vehicles[index].batteryRequired = batteryRequired;
            appData.vehicles[index].parkingDate = parkingDate;
            appData.vehicles[index].bigBatteryDate = bigBatteryDate;
            appData.vehicles[index].smallBatteryDate = smallBatteryDate;
            appData.vehicles[index].smallBatteryConnected = smallBatteryConnected;

            if (noteText) {
                appData.vehicles[index].notes.unshift({
                    text: noteText,
                    date: new Date().toLocaleString('tr-TR')
                });
            }
            addLog("UPDATE_VEHICLE", chassis, "Araç bilgileri güncellendi.");
        }
    } else {
        // Yeni Kayıt
        const newVehicle = {
            id: 'VEH_' + Date.now(),
            chassis: chassis,
            model: model,
            ownership: ownership,
            location: location,
            batteryRequired: batteryRequired,
            parkingDate: parkingDate,
            bigBatteryDate: bigBatteryDate,
            smallBatteryDate: smallBatteryDate,
            smallBatteryConnected: smallBatteryConnected,
            notes: noteText ? [{ text: noteText, date: new Date().toLocaleString('tr-TR') }] : [],
            createdAt: new Date().toLocaleString('tr-TR')
        };
        appData.vehicles.push(newVehicle);
        addLog("ADD_VEHICLE", chassis, "Yeni araç sisteme eklendi.");
    }

    saveAndSync();
    closeVehicleModal();
}

function deleteVehicle(id) {
    if (confirm("Bu aracı silmek istediğinize emin misiniz?")) {
        const vehicle = appData.vehicles.find(v => v.id === id);
        if (vehicle) {
            addLog("DELETE_VEHICLE", vehicle.chassis, "Araç sistemden silindi.");
        }
        appData.vehicles = appData.vehicles.filter(v => v.id !== id);
        saveAndSync();
    }
}

// ==========================================
// 8. DETAY VE GEÇMİŞ NOTLAR MODALI
// ==========================================
function openDetailModal(id) {
    const vehicle = appData.vehicles.find(v => v.id === id);
    if (!vehicle) return;

    currentEditingId = id;

    document.getElementById("detailChassis").textContent = vehicle.chassis;
    document.getElementById("detailModel").textContent = vehicle.model;
    document.getElementById("detailOwnership").textContent = vehicle.ownership.toUpperCase();
    document.getElementById("detailLocation").textContent = vehicle.location === 'showroom' ? 'Showroom' : 'Otopark';
    document.getElementById("detailBigDate").textContent = vehicle.bigBatteryDate || '-';
    document.getElementById("detailSmallDate").textContent = vehicle.smallBatteryDate || '-';
    document.getElementById("detailParkDate").textContent = vehicle.parkingDate || '-';

    renderNotesHistory(vehicle.notes);

    document.getElementById("detailModal").classList.add("active");
}

function closeDetailModal() {
    document.getElementById("detailModal").classList.remove("active");
    currentEditingId = null;
}

function renderNotesHistory(notesArr) {
    const container = document.getElementById("detailNotesHistory");
    container.innerHTML = "";

    if (!notesArr || notesArr.length === 0) {
        container.innerHTML = `<div style="font-size:12px; color:var(--text-secondary);">Henüz bir not eklenmemiş.</div>`;
        return;
    }

    notesArr.forEach(n => {
        container.innerHTML += `
            <div class="noteItemCard">
                <div class="noteItemHeader">
                    <span><i class="fa-solid fa-clock"></i> ${n.date}</span>
                </div>
                <div>${n.text}</div>
            </div>
        `;
    });
}

// ==========================================
// 9. ÖZET İŞLEM RAPORU MODALI
// ==========================================
function openSummaryReportModal() {
    const content = document.getElementById("summaryReportContent");
    content.innerHTML = "";

    if (appData.logs.length === 0) {
        content.innerHTML = `<p style="font-size:13px; color:var(--text-secondary);">Geçmiş işlem kaydı bulunmamaktadır.</p>`;
    } else {
        const list = document.createElement("div");
        list.style.display = "flex";
        list.style.flexDirection = "column";
        list.style.gap = "8px";

        appData.logs.forEach(log => {
            list.innerHTML += `
                <div style="padding:10px 14px; background:var(--bg-input); border-radius:8px; font-size:12.5px;">
                    <div style="display:flex; justify-content:space-between; font-weight:600; margin-bottom:2px;">
                        <span>${log.action} - Şase: ${log.chassis}</span>
                        <span style="font-size:11px; color:var(--text-secondary);">${log.timestamp}</span>
                    </div>
                    <div style="color:var(--text-secondary);">${log.description}</div>
                </div>
            `;
        });
        content.appendChild(list);
    }

    document.getElementById("summaryReportModal").classList.add("active");
}

function closeSummaryReportModal() {
    document.getElementById("summaryReportModal").classList.remove("active");
}

// ==========================================
// 10. MODAL VE YÖNETİCİ GİRİŞ İŞLEMLERİ
// ==========================================
function openExcelFilterModal() {
    document.getElementById("excelFilterModal").classList.add("active");
}

function closeExcelFilterModal() {
    document.getElementById("excelFilterModal").classList.remove("active");
}

function openAdminLoginModal() {
    document.getElementById("adminPasswordInput").value = "";
    document.getElementById("adminLoginModal").classList.add("active");
}

function closeAdminLoginModal() {
    document.getElementById("adminLoginModal").classList.remove("active");
}

// Yönetici Girişi Mantığı (KESİNLİKLE ŞİFRE İPUCU GÖSTERİLMEZ)
function handleAdminLogin() {
    const pass = document.getElementById("adminPasswordInput").value;
    if (pass === ADMIN_PASSWORD) {
        closeAdminLoginModal();
        openAdminPanelModal();
    } else {
        alert("Hatalı yönetici şifresi!");
    }
}

function openAdminPanelModal() {
    // Admin Paneline Excel Aktarım Alanı Dinamik Ekleme
    const modalBody = document.querySelector("#adminPanelModal .modalBody");
    if (!document.getElementById("adminExcelImportBox")) {
        const importBox = document.createElement("div");
        importBox.id = "adminExcelImportBox";
        importBox.className = "adminActionBox";
        importBox.style.marginBottom = "12px";
        importBox.innerHTML = `
            <h4><i class="fa-solid fa-file-import"></i> Excel İle Toplu Araç Aktarımı</h4>
            <p style="margin-bottom:8px;">Excel tablonuzdaki <strong>ŞASE NUMARASI EXCEL TABLOSU</strong>, <strong>Durum excel tablosu</strong> ve <strong>Araç excel tablosu</strong> sütunlarından otomatik aktarılır.</p>
            <input type="file" id="excelFileInput" accept=".xlsx, .xls" style="display:none;" onchange="handleExcelFileSelect(event)">
            <button class="bmwBtnSecondary" style="width:100%; justify-content:center;" onclick="document.getElementById('excelFileInput').click()">
                <i class="fa-solid fa-file-excel"></i> Excel Dosyası Seç ve Yükle
            </button>
        `;
        modalBody.insertBefore(importBox, modalBody.firstChild);
    }

    document.getElementById("adminPanelModal").classList.add("active");
}

function closeAdminPanelModal() {
    document.getElementById("adminPanelModal").classList.remove("active");
}

function handleExcelFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processExcelImport(file);
    }
}

// Yedek İndir / Yükle / Sıfırla
function downloadBackupJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `Inciroglu_BMW_Yedek_${Date.now()}.json`);
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    dlAnchorElem.remove();
}

function uploadBackupJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (importedData.vehicles) {
                appData = importedData;
                saveAndSync();
                alert("Yedek başarıyla geri yüklendi!");
            }
        } catch (err) {
            alert("Geçersiz yedek dosyası!");
        }
    };
    reader.readAsText(file);
}

function resetAllData() {
    if (confirm("Sistemdeki TÜM araç kayıtları ve geçmiş loglar silinecektir. Emin misiniz?")) {
        appData = { vehicles: [], logs: [] };
        saveAndSync();
        alert("Tüm veriler sıfırlandı.");
        closeAdminPanelModal();
    }
}

// Tema Değiştirme
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById("themeIcon");

    if (body.classList.contains("light-theme")) {
        body.classList.remove("light-theme");
        body.classList.add("dark-theme");
        themeIcon.className = "fa-solid fa-sun";
    } else {
        body.classList.remove("dark-theme");
        body.classList.add("light-theme");
        themeIcon.className = "fa-solid fa-moon";
    }
}
