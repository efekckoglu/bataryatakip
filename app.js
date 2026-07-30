let vehicles = [];
let logs = [];
let editingVehicleId = null;

// Sayfa Yüklendiğinde Firebase Dinleyicilerini Başlat
document.addEventListener("DOMContentLoaded", () => {
    initDateDisplay();
    waitForFirebaseAndListen();
});

function initDateDisplay() {
    const today = new Date().toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
    const dateElement = document.getElementById("todayDate");
    if (dateElement) dateElement.innerText = today;
}

// Firebase Bağlantısını Bekle ve Gerçek Zamanlı Dinleyicileri Çalıştır
function waitForFirebaseAndListen() {
    if (window.db && window.fs) {
        setupFirebaseListeners();
    } else {
        setTimeout(waitForFirebaseAndListen, 200);
    }
}

function setupFirebaseListeners() {
    const { collection, onSnapshot } = window.fs;

    // Aktif Araçları Dinle
    onSnapshot(collection(window.db, "vehicles"), (snapshot) => {
        vehicles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderDashboard();
    }, (error) => {
        console.error("Vehicles dinlenirken hata oluştu:", error);
    });

    // Sistem Logları ve Silinen Araç Kayıtlarını Dinle
    onSnapshot(collection(window.db, "logs"), (snapshot) => {
        logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }, (error) => {
        console.error("Loglar dinlenirken hata oluştu:", error);
    });
}

// AR A YÜZ RENDER VE TABLO İŞLEMLERİ
function renderDashboard() {
    const showroomBody = document.getElementById("showroomTableBody");
    const parkingBody = document.getElementById("parkingTableBody");
    const notifArea = document.getElementById("notificationArea");

    if (!showroomBody || !parkingBody) return;

    showroomBody.innerHTML = "";
    parkingBody.innerHTML = "";
    if (notifArea) notifArea.innerHTML = "";

    let showroomCount = 0;
    let parkingCount = 0;
    let dangerCount = 0;

    const today = new Date();

    vehicles.forEach(vehicle => {
        const isShowroom = vehicle.location === "showroom";
        if (isShowroom) showroomCount++;
        else parkingCount++;

        // Gün Farkı Hesabı
        let bigDaysDiff = vehicle.bigBatteryDate ? calculateDayDiff(vehicle.bigBatteryDate, today) : null;
        let parkDaysDiff = vehicle.parkingDate ? calculateDayDiff(vehicle.parkingDate, today) : null;

        let isDanger = false;
        let dangerMessage = "";

        if (vehicle.batteryRequired === "yes") {
            if (isShowroom) {
                if (bigDaysDiff !== null && bigDaysDiff > 10) {
                    isDanger = true;
                    dangerMessage = `${vehicle.chassis} şaseli araç 10 günden fazladır aküde (${bigDaysDiff} Gün)! Şarj/Söküm Gerekli!`;
                }
                if (vehicle.smallBatteryConnected === "no") {
                    isDanger = true;
                    dangerMessage += dangerMessage ? " Ayrıca Küçük Akü Bağlı Değil!" : `${vehicle.chassis} şaseli aracın Küçük Aküsü Bağlı Değil!`;
                }
            } else { // Otopark
                if (parkDaysDiff !== null && parkDaysDiff > 10 && !vehicle.bigBatteryDate) {
                    isDanger = true;
                    dangerMessage = `${vehicle.chassis} şaseli araç 10 günden fazla süredir Otoparkta ve Büyük Aküye Bağlanmadı!`;
                }
            }
        }

        if (isDanger) {
            dangerCount++;
            if (notifArea) {
                notifArea.innerHTML += `
                    <div class="notificationCard danger">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <div>
                            <strong>${vehicle.chassis} - ${vehicle.model}</strong>
                            <p>${dangerMessage}</p>
                        </div>
                    </div>
                `;
            }
        }

        // Showroom Tablo Satırı
        if (isShowroom) {
            let smallBatteryBadge = "";
            let bigBatteryBadge = "";

            if (vehicle.batteryRequired === "no") {
                smallBatteryBadge = `<span class="badge gray">Gerekmiyor</span>`;
                bigBatteryBadge = `<span class="badge gray">Gerekmiyor</span>`;
            } else {
                smallBatteryBadge = vehicle.smallBatteryConnected === "yes" 
                    ? `<span class="badge green">Bağlı (Yeşil)</span>` 
                    : `<span class="badge red">Bağlı Değil</span>`;
                
                bigBatteryBadge = (bigDaysDiff !== null && bigDaysDiff > 10)
                    ? `<span class="badge red">İkaz (${bigDaysDiff} Gün)</span>`
                    : `<span class="badge green">Normal</span>`;
            }

            showroomBody.innerHTML += `
                <tr>
                    <td><strong>${vehicle.chassis}</strong></td>
                    <td>${vehicle.model} <br><small style="color:var(--text-secondary);">${vehicle.ownership === 'stok' ? 'Stok' : 'Konsinye'}</small></td>
                    <td>${vehicle.bigBatteryDate || '-'}</td>
                    <td>${bigDaysDiff !== null ? bigDaysDiff + ' Gün' : '-'}</td>
                    <td>${smallBatteryBadge}</td>
                    <td>${bigBatteryBadge}</td>
                    <td>
                        <button class="actionBtn view" onclick="openDetailModal('${vehicle.id}')" title="Detay"><i class="fa-solid fa-eye"></i></button>
                        <button class="actionBtn edit" onclick="openVehicleModal('${vehicle.id}')" title="Düzenle"><i class="fa-solid fa-pen"></i></button>
                        <button class="actionBtn delete" onclick="handleDeleteVehicle('${vehicle.id}')" title="Sil"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        } else {
            // Otopark Tablo Satırı
            let bigBatteryBadge = "";
            if (vehicle.batteryRequired === "no") {
                bigBatteryBadge = `<span class="badge gray">Gerekmiyor</span>`;
            } else {
                bigBatteryBadge = vehicle.bigBatteryDate 
                    ? `<span class="badge green">Bağlı (${vehicle.bigBatteryDate})</span>`
                    : `<span class="badge red">Bağlanmadı</span>`;
            }

            parkingBody.innerHTML += `
                <tr>
                    <td><strong>${vehicle.chassis}</strong></td>
                    <td>${vehicle.model} <br><small style="color:var(--text-secondary);">${vehicle.ownership === 'stok' ? 'Stok' : 'Konsinye'}</small></td>
                    <td>${vehicle.parkingDate || '-'} (${parkDaysDiff !== null ? parkDaysDiff + ' Gün' : '-'})</td>
                    <td>${vehicle.bigBatteryDate || '-'}</td>
                    <td>${bigBatteryBadge}</td>
                    <td>
                        <button class="actionBtn view" onclick="openDetailModal('${vehicle.id}')" title="Detay"><i class="fa-solid fa-eye"></i></button>
                        <button class="actionBtn edit" onclick="openVehicleModal('${vehicle.id}')" title="Düzenle"><i class="fa-solid fa-pen"></i></button>
                        <button class="actionBtn delete" onclick="handleDeleteVehicle('${vehicle.id}')" title="Sil"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }
    });

    if (notifArea && notifArea.innerHTML === "") {
        notifArea.innerHTML = `<div class="notificationCard green"><i class="fa-solid fa-circle-check"></i> <div><strong>Tüm Araçlar Güvende</strong><p>Akü ikazı gerektiren herhangi bir araç bulunmamaktadır.</p></div></div>`;
    }

    // Dashboard Sayılarını Güncelle
    document.getElementById("totalVehicle").innerText = vehicles.length;
    document.getElementById("showroomCount").innerText = showroomCount;
    document.getElementById("parkingCount").innerText = parkingCount;
    document.getElementById("dangerVehicle").innerText = dangerCount;
}

function calculateDayDiff(dateStr, targetDate) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const diffTime = Math.abs(targetDate - d);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// MODAL VE FORM YÖNETİMİ
function toggleBatteryDateInputs() {
    const batteryRequired = document.getElementById("batteryRequired").value;
    const wrapper = document.getElementById("batteryDatesWrapper");
    
    if (batteryRequired === "yes") {
        wrapper.classList.remove("hidden");
    } else {
        wrapper.classList.add("hidden");
    }
}

function handleLocationChangeInModal() {
    const loc = document.getElementById("vehicleLocation").value;
    const parkGrp = document.getElementById("parkingDateGroup");
    const smallGrp = document.getElementById("smallBatteryDateGroup");
    const smallStatusGrp = document.getElementById("smallBatteryStatusGroup");

    if (loc === "parking") {
        parkGrp.classList.remove("hidden");
        smallGrp.classList.add("hidden");
        smallStatusGrp.classList.add("hidden");
    } else {
        parkGrp.classList.add("hidden");
        smallGrp.classList.remove("hidden");
        smallStatusGrp.classList.remove("hidden");
    }
}

function openVehicleModal(vehicleId = null) {
    editingVehicleId = vehicleId;
    const modal = document.getElementById("vehicleModal");
    const title = document.getElementById("modalTitle");

    if (vehicleId) {
        const v = vehicles.find(item => item.id === vehicleId);
        if (!v) return;

        title.innerText = "Araç Düzenle";
        document.getElementById("vehicleChassis").value = v.chassis || "";
        document.getElementById("vehicleModel").value = v.model || "";
        document.getElementById("vehicleOwnership").value = v.ownership || "stok";
        document.getElementById("vehicleLocation").value = v.location || "showroom";
        document.getElementById("batteryRequired").value = v.batteryRequired || "no";
        document.getElementById("parkingDate").value = v.parkingDate || "";
        document.getElementById("bigBatteryDate").value = v.bigBatteryDate || "";
        document.getElementById("smallBatteryDate").value = v.smallBatteryDate || "";
        document.getElementById("smallBatteryConnected").value = v.smallBatteryConnected || "yes";
        document.getElementById("vehicleNote").value = "";
    } else {
        title.innerText = "Yeni Araç Ekle";
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

    handleLocationChangeInModal();
    toggleBatteryDateInputs();
    modal.classList.add("active");
}

function closeVehicleModal() {
    document.getElementById("vehicleModal").classList.remove("active");
    editingVehicleId = null;
}

// ARAÇ KAYDET / GÜNCELLE
async function handleSaveVehicle() {
    const chassis = document.getElementById("vehicleChassis").value.trim();
    const model = document.getElementById("vehicleModel").value.trim();
    const ownership = document.getElementById("vehicleOwnership").value;
    const location = document.getElementById("vehicleLocation").value;
    const batteryRequired = document.getElementById("batteryRequired").value;
    const parkingDate = document.getElementById("parkingDate").value;
    const bigBatteryDate = document.getElementById("bigBatteryDate").value;
    const smallBatteryDate = document.getElementById("smallBatteryDate").value;
    const smallBatteryConnected = document.getElementById("smallBatteryConnected").value;
    const note = document.getElementById("vehicleNote").value.trim();

    if (!chassis || !model) {
        alert("Lütfen Şase No ve Model alanlarını doldurunuz!");
        return;
    }

    const { collection, addDoc, doc, updateDoc } = window.fs;
    const timestamp = new Date().toLocaleString("tr-TR");

    let historyItem = {
        date: timestamp,
        action: editingVehicleId ? "Güncellendi" : "Sisteme Eklendi",
        note: note || "İşlem notu girilmedi."
    };

    if (editingVehicleId) {
        const currentV = vehicles.find(x => x.id === editingVehicleId);
        const updatedNotes = currentV && currentV.notesHistory ? [historyItem, ...currentV.notesHistory] : [historyItem];

        const vehicleRef = doc(window.db, "vehicles", editingVehicleId);
        await updateDoc(vehicleRef, {
            chassis, model, ownership, location, batteryRequired,
            parkingDate, bigBatteryDate, smallBatteryDate, smallBatteryConnected,
            notesHistory: updatedNotes
        });

        // Log Kaydı
        await addDoc(collection(window.db, "logs"), {
            chassis, model, action: "Güncelleme", date: timestamp, note: note || "Araç bilgileri güncellendi."
        });
    } else {
        await addDoc(collection(window.db, "vehicles"), {
            chassis, model, ownership, location, batteryRequired,
            parkingDate, bigBatteryDate, smallBatteryDate, smallBatteryConnected,
            notesHistory: [historyItem],
            createdDate: timestamp
        });

        await addDoc(collection(window.db, "logs"), {
            chassis, model, action: "Yeni Ekleme", date: timestamp, note: note || "Araç ilk defa eklendi."
        });
    }

    closeVehicleModal();
}

// ARAÇ SİLME
async function handleDeleteVehicle(id) {
    const v = vehicles.find(item => item.id === id);
    if (!v) return;

    const reason = prompt(`"${v.chassis}" şaseli aracı silmek istediğinize emin misiniz?\nSilme Sebebi / Not Giriniz:`);
    if (reason === null) return; // İptal edildi

    const { doc, deleteDoc, collection, addDoc } = window.fs;
    const timestamp = new Date().toLocaleString("tr-TR");

    // Silinen Araç Verisini Loglara Detaylı Yaz
    await addDoc(collection(window.db, "logs"), {
        isDeletedVehicle: true,
        chassis: v.chassis,
        model: v.model,
        ownership: v.ownership,
        location: v.location,
        batteryRequired: v.batteryRequired,
        bigBatteryDate: v.bigBatteryDate || "-",
        smallBatteryDate: v.smallBatteryDate || "-",
        parkingDate: v.parkingDate || "-",
        action: "Silindi / Stoktan Çıkarıldı",
        date: timestamp,
        note: reason || "Silme sebebi belirtilmedi."
    });

    // Araç Koleksiyonundan Kaldır
    await deleteDoc(doc(window.db, "vehicles", id));
}

// ARAÇ DETAY MODALI
function openDetailModal(id) {
    const v = vehicles.find(item => item.id === id);
    if (!v) return;

    document.getElementById("detailChassis").innerText = v.chassis || "-";
    document.getElementById("detailModel").innerText = v.model || "-";
    document.getElementById("detailOwnership").innerText = (v.ownership === "stok" ? "Stok Aracı" : "Konsinye Araç");
    document.getElementById("detailLocation").innerText = (v.location === "showroom" ? "Showroom" : "Otopark");
    
    if(v.batteryRequired === "no") {
        document.getElementById("detailBigDate").innerText = "Gerekmiyor";
        document.getElementById("detailSmallDate").innerText = "Gerekmiyor";
    } else {
        document.getElementById("detailBigDate").innerText = v.bigBatteryDate || "Bağlanmadı";
        document.getElementById("detailSmallDate").innerText = v.smallBatteryDate || "Bağlanmadı";
    }
    
    document.getElementById("detailParkDate").innerText = v.parkingDate || "-";

    const histContainer = document.getElementById("detailNotesHistory");
    histContainer.innerHTML = "";

    if (v.notesHistory && v.notesHistory.length > 0) {
        v.notesHistory.forEach(nh => {
            histContainer.innerHTML += `
                <div class="noteItem">
                    <div class="noteHeader">
                        <span><strong>${nh.action}</strong></span>
                        <small>${nh.date}</small>
                    </div>
                    <p class="noteText">${nh.note}</p>
                </div>
            `;
        });
    } else {
        histContainer.innerHTML = `<p style="font-size:12px; color:var(--text-secondary);">Henüz geçmiş kayıt yok.</p>`;
    }

    document.getElementById("detailModal").classList.add("active");
}

function closeDetailModal() {
    document.getElementById("detailModal").classList.remove("active");
}

// ÖZET İŞLEM RAPORU MODALI
function openSummaryReportModal() {
    const content = document.getElementById("summaryReportContent");
    content.innerHTML = "";

    if (logs.length === 0) {
        content.innerHTML = `<p style="text-align:center; color:var(--text-secondary);">Sistemde kayıtlı herhangi bir işlem logu bulunamadı.</p>`;
    } else {
        let html = `<table style="width:100%; font-size:12px; text-align:left; border-collapse:collapse;">
            <thead>
                <tr style="border-bottom:2px solid var(--border-color); color:var(--text-secondary);">
                    <th style="padding:8px;">Tarih</th>
                    <th style="padding:8px;">Şase</th>
                    <th style="padding:8px;">Model</th>
                    <th style="padding:8px;">İşlem Türü</th>
                    <th style="padding:8px;">Açıklama / Not</th>
                </tr>
            </thead>
            <tbody>`;
        
        // Yeniden eskiye sırala
        const sortedLogs = [...logs].reverse();
        sortedLogs.forEach(l => {
            html += `
                <tr style="border-bottom:1px solid var(--border-color);">
                    <td style="padding:8px;">${l.date || '-'}</td>
                    <td style="padding:8px;"><strong>${l.chassis || '-'}</strong></td>
                    <td style="padding:8px;">${l.model || '-'}</td>
                    <td style="padding:8px;"><span class="badge ${l.action.includes('Silindi') ? 'red' : 'green'}">${l.action}</span></td>
                    <td style="padding:8px;">${l.note || '-'}</td>
                </tr>
            `;
        });
        html += `</tbody></table>`;
        content.innerHTML = html;
    }

    document.getElementById("summaryReportModal").classList.add("active");
}

function closeSummaryReportModal() {
    document.getElementById("summaryReportModal").classList.remove("active");
}

// TARİHLİ EXCEL İNDİRME MODALI
function openExcelFilterModal() {
    document.getElementById("excelFilterModal").classList.add("active");
}

function closeExcelFilterModal() {
    document.getElementById("excelFilterModal").classList.remove("active");
}

/* =============================================================
   GELİŞMİŞ VE PROFESYONEL EXCEL RAPORU OLUŞTURMA ALGORİTMASI
   ============================================================= */
function exportInventoryToExcelWithDates() {
    const startDate = document.getElementById("excelStartDate").value;
    const endDate = document.getElementById("excelEndDate").value;

    // Excel Veri Dizisi
    const excelData = [];

    // Başlık ve Rapor Bilgisi
    excelData.push(["İNCİROĞLU BMW - AKÜ KONTROL VE ARAÇ STOK RAPORU"]);
    excelData.push(["Rapor Oluşturma Tarihi:", new Date().toLocaleString("tr-TR")]);
    if (startDate || endDate) {
        excelData.push(["Filtre Tarih Aralığı:", `${startDate || 'Başlangıçtan'} ile ${endDate || 'Bugüne'}`]);
    }
    excelData.push([]); // Boş satır

    // --- BÖLÜM 1: AKTİF ARAÇ STOK LİSTESİ ---
    excelData.push(["--- AKTİF ARAÇ STOK VE AKÜ DURUM LİSTESİ ---"]);
    excelData.push([
        "Şase No (VIN)", 
        "Marka & Model", 
        "Mülkiyet", 
        "Konum", 
        "Akü Bağlantı İhtiyacı", 
        "Büyük Akü Bağlantı Tarihi", 
        "Küçük Akü Bağlantı Tarihi", 
        "Küçük Akü Bağlantı Durumu", 
        "Otoparka Çekilme Tarihi", 
        "Son İşlem / Not Geçmişi"
    ]);

    vehicles.forEach(v => {
        let bigBattStatus = v.batteryRequired === "no" ? "Gerekmiyor" : (v.bigBatteryDate || "Bağlanmadı");
        let smallBattDate = v.batteryRequired === "no" ? "Gerekmiyor" : (v.smallBatteryDate || "Bağlanmadı");
        let smallBattStatus = v.batteryRequired === "no" ? "Gerekmiyor" : (v.smallBatteryConnected === "yes" ? "Bağlı (Yeşil)" : "Bağlı Değil (Kırmızı)");
        
        let lastNote = (v.notesHistory && v.notesHistory.length > 0) 
            ? `${v.notesHistory[0].date} - ${v.notesHistory[0].note}` 
            : "Not yok";

        excelData.push([
            v.chassis || "",
            v.model || "",
            v.ownership === "stok" ? "Stok" : "Konsinye",
            v.location === "showroom" ? "Showroom" : "Otopark",
            v.batteryRequired === "yes" ? "Evet (Gerekli)" : "Hayır (Gerekmiyor)",
            bigBattStatus,
            smallBattDate,
            smallBattStatus,
            v.parkingDate || "-",
            lastNote
        ]);
    });

    excelData.push([]); 
    excelData.push([]); // Boşluklar

    // --- BÖLÜM 2: SİLİNEN VE SİSTEMDEN ÇIKARILAN ARAÇLAR GEÇMİŞİ ---
    excelData.push(["--- SİLİNEN VE SİSTEMDEN ÇIKARILAN ARAÇ GEÇMİŞİ ---"]);
    excelData.push([
        "Silinme Tarihi", 
        "Şase No (VIN)", 
        "Marka & Model", 
        "Son Konumu", 
        "Mülkiyet", 
        "Büyük Akü Tarihi", 
        "Küçük Akü Tarihi", 
        "Silinme Sebebi / İşlem Notu"
    ]);

    const deletedLogs = logs.filter(l => l.isDeletedVehicle || (l.action && l.action.includes("Silindi")));

    if (deletedLogs.length === 0) {
        excelData.push(["Silinen veya sistemden çıkarılan araç bulunmamaktadır."]);
    } else {
        deletedLogs.forEach(dl => {
            excelData.push([
                dl.date || "-",
                dl.chassis || "-",
                dl.model || "-",
                dl.location === "showroom" ? "Showroom" : (dl.location === "parking" ? "Otopark" : "-"),
                dl.ownership || "-",
                dl.bigBatteryDate || "-",
                dl.smallBatteryDate || "-",
                dl.note || "Açıklama Belirtilmedi"
            ]);
        });
    }

    // SheetJS ile Workbook Oluştur
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);

    // Sütun Genişliklerini Ayarla (Autofit)
    const colWidths = [
        { wch: 22 }, // Şase No
        { wch: 25 }, // Model
        { wch: 14 }, // Mülkiyet
        { wch: 14 }, // Konum
        { wch: 22 }, // Akü İhtiyacı
        { wch: 24 }, // Büyük Akü
        { wch: 24 }, // Küçük Akü
        { wch: 25 }, // Küçük Akü Durum
        { wch: 22 }, // Otopark Tarihi
        { wch: 45 }  // Notlar
    ];
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Akü & Stok Raporu");

    // İndir
    const fileName = `Inciroglu_BMW_Aku_Kontrol_Raporu_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    closeExcelFilterModal();
}

// ADMIN PANELİ İŞLEMLERİ
function openAdminLoginModal() {
    document.getElementById("adminLoginModal").classList.add("active");
}
function closeAdminLoginModal() {
    document.getElementById("adminPasswordInput").value = "";
    document.getElementById("adminLoginModal").classList.remove("active");
}
function handleAdminLogin() {
    const pass = document.getElementById("adminPasswordInput").value;
    if (pass === "1234" || pass === "admin") {
        closeAdminLoginModal();
        document.getElementById("adminPanelModal").classList.add("active");
    } else {
        alert("Hatalı yönetici şifresi!");
    }
}
function closeAdminPanelModal() {
    document.getElementById("adminPanelModal").classList.remove("active");
}

// YEDEKLEME JSON
function downloadBackupJSON() {
    const backupData = { vehicles, logs, backupDate: new Date().toISOString() };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `Inciroglu_BMW_Sistem_Yedek_${new Date().toISOString().slice(0,10)}.json`);
    dlAnchorElem.click();
}

async function uploadBackupJSON(event) {
    const fileReader = new FileReader();
    fileReader.onload = async function (e) {
        try {
            const parsedData = JSON.parse(e.target.result);
            if (parsedData.vehicles) {
                const { collection, addDoc } = window.fs;
                for (let v of parsedData.vehicles) {
                    delete v.id;
                    await addDoc(collection(window.db, "vehicles"), v);
                }
                alert("Yedek başarıyla içeri aktarıldı!");
                closeAdminPanelModal();
            }
        } catch (err) {
            alert("Yüklenen dosya geçerli bir yedek JSON formatında değil!");
        }
    };
    fileReader.readAsText(event.target.files[0]);
}

async function resetAllData() {
    if (confirm("TÜM verileri ve log geçmişini silmek istediğinize emin misiniz? Bu işlem GERİ ALINAMAZ!")) {
        const { doc, deleteDoc } = window.fs;
        for (let v of vehicles) {
            await deleteDoc(doc(window.db, "vehicles", v.id));
        }
        for (let l of logs) {
            await deleteDoc(doc(window.db, "logs", l.id));
        }
        alert("Tüm sistem verileri başarıyla sıfırlandı.");
        closeAdminPanelModal();
    }
}

// Tema Değiştirme
function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById("themeIcon");
    if (body.classList.contains("light-theme")) {
        body.classList.remove("light-theme");
        body.classList.add("dark-theme");
        icon.className = "fa-solid fa-sun";
    } else {
        body.classList.remove("dark-theme");
        body.classList.add("light-theme");
        icon.className = "fa-solid fa-moon";
    }
}
