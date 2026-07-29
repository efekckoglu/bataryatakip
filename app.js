// İnciroğlu BMW - Akü Takip & Yönetim Sistemi JS Logic

// Default / Sample Data (When local storage is empty)
let defaultVehicles = [
    {
        chassis: "WBA11AH090FP12345",
        model: "BMW i4 M50",
        location: "showroom",
        ownership: "stok",
        batteryRequired: "yes",
        bigBatteryDate: "2026-07-01",
        smallBatteryDate: "2026-07-01",
        smallBatteryConnected: "yes",
        parkingDate: "",
        notes: [
            { date: "2026-07-01 10:30", text: "Showroom teşhir alanına alındı, büyük ve küçük akü şarj edildi." }
        ]
    },
    {
        chassis: "WBA22BH090FP67890",
        model: "BMW X5 xDrive40i",
        location: "showroom",
        ownership: "konsinye",
        batteryRequired: "yes",
        bigBatteryDate: "2026-06-15",
        smallBatteryDate: "2026-06-15",
        smallBatteryConnected: "no",
        parkingDate: "",
        notes: [
            { date: "2026-06-15 14:20", text: "Konsinye teşhir aracı. Küçük akü ikaz veriyor." }
        ]
    },
    {
        chassis: "WBA33CH090FP11223",
        model: "BMW 320i M Sport",
        location: "parking",
        ownership: "stok",
        batteryRequired: "yes",
        bigBatteryDate: "2026-07-10",
        smallBatteryDate: "",
        smallBatteryConnected: "no",
        parkingDate: "2026-07-10",
        notes: [
            { date: "2026-07-10 09:00", text: "Otopark stoğuna çekildi." }
        ]
    },
    {
        chassis: "WMW44DH090FP44556",
        model: "MINI Cooper SE",
        location: "parking",
        ownership: "stok",
        batteryRequired: "no",
        bigBatteryDate: "",
        smallBatteryDate: "",
        smallBatteryConnected: "no",
        parkingDate: "2026-07-05",
        notes: [
            { date: "2026-07-05 16:45", text: "Otopark 2. alana yerleştirildi." }
        ]
    }
];

let vehicles = [];
let logs = [];
let currentEditingIndex = null;

// Initialize System
document.head.appendChild(Object.assign(document.createElement('style'), { textContent: `.mColorBadge { font-weight: bold; color: var(--bmw-blue); }` }));

document.addEventListener("DOMContentLoaded", () => {
    loadData();
    setTodayDate();
    renderAll();
});

function setTodayDate() {
    const today = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    document.getElementById("todayDate").innerText = today;
}

function loadData() {
    const storedVehicles = localStorage.getItem("inciroglu_vehicles");
    const storedLogs = localStorage.getItem("inciroglu_logs");

    if (storedVehicles) {
        vehicles = JSON.parse(storedVehicles);
    } else {
        vehicles = defaultVehicles;
        saveData();
    }

    if (storedLogs) {
        logs = JSON.parse(storedLogs);
    } else {
        logs = [
            { date: "2026-07-29 09:00", action: "Sistem Başlatıldı", details: "İlk araç stok ve akü veri seti yüklendi." }
        ];
        localStorage.setItem("inciroglu_logs", JSON.stringify(logs));
    }
}

function saveData() {
    localStorage.setItem("inciroglu_vehicles", JSON.stringify(vehicles));
    localStorage.setItem("inciroglu_logs", JSON.stringify(logs));
}

function addLog(action, details) {
    const now = new Date();
    const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);
    logs.unshift({ date: dateStr, action, details });
    saveData();
}

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

function getDaysBetween(dateString) {
    if (!dateString) return null;
    const targetDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today - targetDate);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function renderAll() {
    renderShowroomTable();
    renderParkingTable();
    renderDashboardCards();
    renderNotifications();
}

function renderDashboardCards() {
    const total = vehicles.length;
    const showroom = vehicles.filter(v => v.location === "showroom").length;
    const parking = vehicles.filter(v => v.location === "parking").length;

    let dangerCount = 0;
    vehicles.forEach(v => {
        if (v.location === "showroom") {
            const bigDays = getDaysBetween(v.bigBatteryDate);
            if (v.smallBatteryConnected === "no" || (bigDays !== null && bigDays > 15)) dangerCount++;
        } else if (v.location === "parking") {
            const parkDays = getDaysBetween(v.parkingDate);
            if (parkDays !== null && parkDays >= 10 && v.batteryRequired !== "yes") dangerCount++;
        }
    });

    document.getElementById("totalVehicle").innerText = total;
    document.getElementById("showroomCount").innerText = showroom;
    document.getElementById("parkingCount").innerText = parking;
    document.getElementById("dangerVehicle").innerText = dangerCount;
}

function renderShowroomTable() {
    const tbody = document.getElementById("showroomTableBody");
    tbody.innerHTML = "";

    const showroomVehicles = vehicles.filter(v => v.location === "showroom");

    if (showroomVehicles.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-secondary); padding: 20px;">Showroomda henüz araç bulunmamaktadır.</td></tr>`;
        return;
    }

    showroomVehicles.forEach((v) => {
        const originalIndex = vehicles.findIndex(item => item.chassis === v.chassis);
        const bigDays = getDaysBetween(v.bigBatteryDate);
        
        let bigBatteryStatusHtml = `<span class="badge badge-green"><i class="fa-solid fa-circle-check"></i> Normal</span>`;
        if (bigDays === null) {
            bigBatteryStatusHtml = `<span class="badge badge-yellow"><i class="fa-solid fa-circle-info"></i> Tarih Yok</span>`;
        } else if (bigDays > 15) {
            bigBatteryStatusHtml = `<span class="badge badge-red"><i class="fa-solid fa-triangle-exclamation"></i> Şarj İkazı (${bigDays} Gün)</span>`;
        }

        let smallBatteryStatusHtml = v.smallBatteryConnected === "yes" 
            ? `<span class="badge badge-green"><i class="fa-solid fa-link"></i> Bağlı (Yeşil)</span>` 
            : `<span class="badge badge-red"><i class="fa-solid fa-link-slash"></i> Bağlı Değil (Kırmızı)</span>`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${v.chassis}</strong> <br><small style="color:var(--bmw-blue); font-size:10px;">${v.ownership === 'konsinye' ? 'KONSİNYE' : 'STOK'}</small></td>
            <td>${v.model}</td>
            <td>${v.bigBatteryDate || '-'}</td>
            <td>${bigDays !== null ? bigDays + ' Gün' : '-'}</td>
            <td>${smallBatteryStatusHtml}</td>
            <td>${bigBatteryStatusHtml}</td>
            <td>
                <div class="actionBtns">
                    <button class="btnAction" onclick="openDetailModal(${originalIndex})" title="Detay / Geçmiş"><i class="fa-solid fa-eye"></i></button>
                    <button class="btnAction" onclick="openVehicleModal(${originalIndex})" title="Düzenle"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="btnAction" style="color:#ef4444;" onclick="deleteVehicle(${originalIndex})" title="Sil"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderParkingTable() {
    const tbody = document.getElementById("parkingTableBody");
    tbody.innerHTML = "";

    const parkingVehicles = vehicles.filter(v => v.location === "parking");

    if (parkingVehicles.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-secondary); padding: 20px;">Otopark stok alanında araç bulunmamaktadır.</td></tr>`;
        return;
    }

    parkingVehicles.forEach((v) => {
        const originalIndex = vehicles.findIndex(item => item.chassis === v.chassis);
        const parkDays = getDaysBetween(v.parkingDate);

        let bigBatteryStatusHtml = v.batteryRequired === "yes"
            ? `<span class="badge badge-green"><i class="fa-solid fa-battery-full"></i> Bağlantı Var</span>`
            : `<span class="badge badge-yellow"><i class="fa-solid fa-battery-quarter"></i> Beklemede</span>`;

        if (parkDays !== null && parkDays >= 10 && v.batteryRequired !== "yes") {
            bigBatteryStatusHtml = `<span class="badge badge-red"><i class="fa-solid fa-triangle-exclamation"></i> 10 Gün Doldu! Bağlanmalı</span>`;
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${v.chassis}</strong> <br><small style="color:var(--bmw-blue); font-size:10px;">${v.ownership === 'konsinye' ? 'KONSİNYE' : 'STOK'}</small></td>
            <td>${v.model}</td>
            <td>${v.parkingDate || '-'} ${parkDays !== null ? '(' + parkDays + ' gün önce)' : ''}</td>
            <td>${v.bigBatteryDate || 'Bağlantı Yok'}</td>
            <td>${bigBatteryStatusHtml}</td>
            <td>
                <div class="actionBtns">
                    <button class="btnAction" onclick="openDetailModal(${originalIndex})" title="Detay / Geçmiş"><i class="fa-solid fa-eye"></i></button>
                    <button class="btnAction" onclick="openVehicleModal(${originalIndex})" title="Düzenle"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="btnAction" style="color:#ef4444;" onclick="deleteVehicle(${originalIndex})" title="Sil"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderNotifications() {
    const area = document.getElementById("notificationArea");
    area.innerHTML = "";

    let notifications = [];

    vehicles.forEach((v) => {
        if (v.location === "showroom") {
            if (v.smallBatteryConnected === "no") {
                notifications.push({
                    type: "danger",
                    title: `Showroom Küçük Akü Uyarısı: ${v.model} (${v.chassis})`,
                    desc: "Teşhir aracının küçük akü bağlantısı kesilmiş veya bağlı değil! Lütfen yeşil konuma getirin."
                });
            }
            const bigDays = getDaysBetween(v.bigBatteryDate);
            if (bigDays !== null && bigDays > 15) {
                notifications.push({
                    type: "warning",
                    title: `Showroom Şarj Zamanı: ${v.model} (${v.chassis})`,
                    desc: `Büyük akü şarjından bu yana ${bigDays} gün geçti. Akünün şarj durumunu kontrol ediniz.`
                });
            }
        } else if (v.location === "parking") {
            const parkDays = getDaysBetween(v.parkingDate);
            if (parkDays !== null && parkDays >= 10 && v.batteryRequired !== "yes") {
                notifications.push({
                    type: "danger",
                    title: `Otopark 10 Gün İkazı: ${v.model} (${v.chassis})`,
                    desc: `Araç otoparkta ${parkDays} gündür bekliyor ve takviye/büyük aküye bağlanmamış.`
                });
            }
        }
    });

    if (notifications.length === 0) {
        area.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-secondary); font-size:13px;">
            <i class="fa-solid fa-circle-check" style="color: var(--status-green); font-size: 18px;"></i> Bütün araçların akü ve stok durumu ideal seviyededir. İkaz bulunmuyor.
        </div>`;
        return;
    }

    notifications.forEach(n => {
        const div = document.createElement("div");
        div.className = `notificationCard ${n.type === 'danger' ? '' : 'warning'}`;
        div.innerHTML = `
            <div>
                <strong style="font-size:13px; color:var(--text-primary);"><i class="fa-solid fa-circle-exclamation"></i> ${n.title}</strong>
                <p style="font-size:12px; color:var(--text-secondary); margin-top:2px;">${n.desc}</p>
            </div>
        `;
        area.appendChild(div);
    });
}

// Modal Handles
function openVehicleModal(index = null) {
    currentEditingIndex = index;
    const modal = document.getElementById("vehicleModal");
    const modalTitle = document.getElementById("modalTitle");

    if (index !== null) {
        const v = vehicles[index];
        modalTitle.innerText = "Araç Bilgisi ve Akü Durumu Düzenle";
        document.getElementById("vehicleChassis").value = v.chassis;
        document.getElementById("vehicleModel").value = v.model;
        document.getElementById("vehicleOwnership").value = v.ownership || "stok";
        document.getElementById("vehicleLocation").value = v.location;
        document.getElementById("batteryRequired").value = v.batteryRequired || "no";
        document.getElementById("parkingDate").value = v.parkingDate || "";
        document.getElementById("bigBatteryDate").value = v.bigBatteryDate || "";
        document.getElementById("smallBatteryDate").value = v.smallBatteryDate || "";
        document.getElementById("smallBatteryConnected").value = v.smallBatteryConnected || "no";
        document.getElementById("vehicleNote").value = "";
    }

    handleLocationChangeInModal();
    toggleBatteryDateInputs();
    modal.classList.add("active");
}

function closeVehicleModal() {
    document.getElementById("vehicleModal").classList.remove("active");
}

function handleLocationChangeInModal() {
    const loc = document.getElementById("vehicleLocation").value;
    const parkGrp = document.getElementById("parkingDateGroup");
    const smallGrp = document.getElementById("smallBatteryDateGroup");
    const smallStatGrp = document.getElementById("smallBatteryStatusGroup");

    if (loc === "parking") {
        parkGrp.classList.remove("hidden");
        smallGrp.classList.add("hidden");
        smallStatGrp.classList.add("hidden");
    } else {
        parkGrp.classList.add("hidden");
        smallGrp.classList.remove("hidden");
        smallStatGrp.classList.remove("hidden");
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
    if (currentEditingIndex === null) return;

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

    let existingNotes = vehicles[currentEditingIndex].notes || [];
    if (noteText !== "") {
        const now = new Date();
        const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);
        existingNotes.unshift({ date: dateStr, text: noteText });
    }

    vehicles[currentEditingIndex] = {
        chassis,
        model,
        ownership,
        location,
        batteryRequired,
        parkingDate,
        bigBatteryDate,
        smallBatteryDate,
        smallBatteryConnected,
        notes: existingNotes
    };

    addLog("Araç Güncellendi", `${chassis} şaseli ${model} aracı bilgileri güncellendi.`);
    saveData();
    renderAll();
    closeVehicleModal();
}

function deleteVehicle(index) {
    const v = vehicles[index];
    if (confirm(`${v.chassis} şase numaralı ${v.model} aracını sistemden silmek istediğinize emin misiniz?`)) {
        addLog("Araç Silindi", `${v.chassis} şaseli ${v.model} sistemden silindi.`);
        vehicles.splice(index, 1);
        saveData();
        renderAll();
    }
}

// Detail Modal
function openDetailModal(index) {
    const v = vehicles[index];
    document.getElementById("detailChassis").innerText = v.chassis;
    document.getElementById("detailModel").innerText = v.model;
    document.getElementById("detailOwnership").innerText = (v.ownership === "konsinye") ? "Konsinye Araç" : "Stok Aracı";
    document.getElementById("detailLocation").innerText = (v.location === "showroom") ? "Showroom" : "Otopark";
    document.getElementById("detailBigDate").innerText = v.bigBatteryDate || "Belirtilmedi";
    document.getElementById("detailSmallDate").innerText = v.smallBatteryDate || "Belirtilmedi";
    document.getElementById("detailParkDate").innerText = v.parkingDate || "Belirtilmedi";

    const historyContainer = document.getElementById("detailNotesHistory");
    historyContainer.innerHTML = "";

    if (v.notes && v.notes.length > 0) {
        v.notes.forEach(n => {
            const div = document.createElement("div");
            div.className = "noteItem";
            div.innerHTML = `<div class="noteDate">${n.date}</div><div>${n.text}</div>`;
            historyContainer.appendChild(div);
        });
    } else {
        historyContainer.innerHTML = `<div style="color:var(--text-secondary); text-align:center;">Henüz girilmiş not bulunmuyor.</div>`;
    }

    document.getElementById("detailModal").classList.add("active");
}

function closeDetailModal() {
    document.getElementById("detailModal").classList.remove("active");
}

// Admin & Excel Yükleme Logics
function openAdminLoginModal() {
    document.getElementById("adminLoginModal").classList.add("active");
}

function closeAdminLoginModal() {
    document.getElementById("adminLoginModal").classList.remove("active");
}

function handleAdminLogin() {
    const pass = document.getElementById("adminPasswordInput").value;
    if (pass === "1234" || pass === "admin") {
        closeAdminLoginModal();
        document.getElementById("adminPasswordInput").value = "";
        openAdminPanelModal();
    } else {
        alert("Hatalı yönetici şifresi!");
    }
}

function openAdminPanelModal() {
    document.getElementById("adminPanelModal").classList.add("active");
}

function closeAdminPanelModal() {
    document.getElementById("adminPanelModal").classList.remove("active");
}

// Automatic Excel Upload Functionality
function handleExcelImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                alert("Excel dosyasında veri bulunamadı.");
                return;
            }

            let importedVehicles = [];
            jsonData.forEach(row => {
                const chassis = row['Sasi No'] || row['VIN'] || row['Şase No'] || row['Şase'] || "WBA" + Math.random().toString().substr(2, 10);
                const model = row['Model'] || row['Marka Model'] || row['Araç Model'] || "BMW / MINI";
                let location = (row['Konum'] || row['Lokasyon'] || "").toString().toLowerCase().includes("oto") ? "parking" : "showroom";
                let ownership = (row['Mulkiyet'] || row['Mülkiyet'] || "").toString().toLowerCase().includes("kon") ? "konsinye" : "stok";
                
                const bigBatteryDate = row['Buyuk Aku Tarihi'] || row['Büyük Akü Tarihi'] || "";
                const smallBatteryDate = row['Kucuk Aku Tarihi'] || row['Küçük Akü Tarihi'] || "";
                const parkingDate = row['Otopark Tarihi'] || "";

                importedVehicles.push({
                    chassis: chassis.toString(),
                    model: model.toString(),
                    location: location,
                    ownership: ownership,
                    batteryRequired: (bigBatteryDate !== "") ? "yes" : "no",
                    bigBatteryDate: bigBatteryDate.toString(),
                    smallBatteryDate: smallBatteryDate.toString(),
                    smallBatteryConnected: "yes",
                    parkingDate: parkingDate.toString(),
                    notes: [
                        { date: new Date().toISOString().replace('T', ' ').substring(0, 16), text: "Excel aktarımı ile otomatik yüklendi." }
                    ]
                });
            });

            vehicles = importedVehicles;
            addLog("Excel Verisi Yüklendi", `${importedVehicles.length} adet araç Excel tablosundan içe aktarıldı.`);
            saveData();
            renderAll();
            alert(`Tebrikler! ${importedVehicles.length} adet araç verisi Excel'den başarıyla yüklendi ve analizler yenilendi.`);
            closeAdminPanelModal();

        } catch (error) {
            alert("Excel okunurken hata oluştu! Lütfen geçerli bir Excel (.xlsx / .xls) dosyası yükleyin.");
            console.error(error);
        }
    };
    reader.readAsArrayBuffer(file);
}

// Backup JSON
function downloadBackupJSON() {
    const backupData = {
        vehicles: vehicles,
        logs: logs,
        exportDate: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Inciroglu_BMW_Yedek_${new Date().toISOString().slice(0,10)}.json`);
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
            const data = JSON.parse(e.target.result);
            if (data.vehicles && data.logs) {
                vehicles = data.vehicles;
                logs = data.logs;
                saveData();
                renderAll();
                alert("Yedek başarıyla yüklendi ve güncellendi.");
                closeAdminPanelModal();
            } else {
                alert("Geçersiz yedek dosyası biçimi.");
            }
        } catch (err) {
            alert("Dosya okuma hatası!");
        }
    };
    reader.readAsText(file);
}

function resetAllData() {
    if (confirm("Tüm stok verilerini ve işlem geçmişini kalıcı olarak sıfırlamak istediğinize emin misiniz?")) {
        vehicles = [];
        logs = [{ date: new Date().toISOString().replace('T', ' ').substring(0, 16), action: "Sıfırlandı", details: "Yönetici tarafından tüm veriler temizlendi." }];
        saveData();
        renderAll();
        alert("Sistem verileri başarıyla sıfırlandı.");
        closeAdminPanelModal();
    }
}

// Summary Report Modal
function openSummaryReportModal() {
    const content = document.getElementById("summaryReportContent");
    content.innerHTML = "";

    if (logs.length === 0) {
        content.innerHTML = "<p>Sistemde henüz işlem kaydı yok.</p>";
    } else {
        let html = `<ul style="list-style:none; padding:0;">`;
        logs.forEach(l => {
            html += `<li style="padding:8px 0; border-bottom:1px solid var(--border-color);">
                <span style="font-size:11px; color:var(--text-secondary);">${l.date}</span> - 
                <strong style="color:var(--bmw-blue);">${l.action}:</strong> ${l.details}
            </li>`;
        });
        html += `</ul>`;
        content.innerHTML = html;
    }

    document.getElementById("summaryReportModal").classList.add("active");
}

function closeSummaryReportModal() {
    document.getElementById("summaryReportModal").classList.remove("active");
}

// Excel Export Filter Modal
function openExcelFilterModal() {
    document.getElementById("excelFilterModal").classList.add("active");
}

function closeExcelFilterModal() {
    document.getElementById("excelFilterModal").classList.remove("active");
}

function exportInventoryToExcelWithDates() {
    const startDate = document.getElementById("excelStartDate").value;
    const endDate = document.getElementById("excelEndDate").value;

    let exportData = vehicles.map(v => ({
        "Şase No (VIN)": v.chassis,
        "Marka & Model": v.model,
        "Mülkiyet": v.ownership === 'konsinye' ? 'Konsinye' : 'Stok',
        "Konum": v.location === 'showroom' ? 'Showroom' : 'Otopark',
        "Büyük Akü Tarihi": v.bigBatteryDate || '-',
        "Küçük Akü Tarihi": v.smallBatteryDate || '-',
        "Otopark Tarihi": v.parkingDate || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stok ve Akü Raporu");

    XLSX.writeFile(wb, `Inciroglu_BMW_Stok_Raporu_${new Date().toISOString().slice(0,10)}.xlsx`);
    closeExcelFilterModal();
}
