let currentVehicles = [];
let pendingDeleteVehicleId = null;

// Tarih Formatlayıcı
function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("tr-TR");
}

// Uygulama İlk Çalıştırma
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("todayDate").innerText = new Date().toLocaleDateString("tr-TR", {
        day: "numeric", month: "long", year: "numeric", weekday: "long"
    });
    initFirebaseListener();
});

// Firebase Veri Dinleyicisi
function initFirebaseListener() {
    if (!window.db) {
        setTimeout(initFirebaseListener, 300);
        return;
    }

    const { collection, onSnapshot } = window.fs;
    onSnapshot(collection(window.db, "vehicles"), (snapshot) => {
        currentVehicles = [];
        snapshot.forEach((doc) => {
            currentVehicles.push({ id: doc.id, ...doc.data() });
        });
        renderDashboard();
    });
}

// Ekran / Dashboard Render
function renderDashboard() {
    const showroomBody = document.getElementById("showroomTableBody");
    const parkingBody = document.getElementById("parkingTableBody");

    showroomBody.innerHTML = "";
    parkingBody.innerHTML = "";

    let showroomCount = 0;
    let parkingCount = 0;
    let dangerCount = 0;

    currentVehicles.forEach((v) => {
        if (v.location === "showroom") {
            showroomCount++;
            
            // Gün hesaplama
            let diffDays = "-";
            if (v.bigBatteryDate) {
                const bDate = new Date(v.bigBatteryDate);
                const now = new Date();
                diffDays = Math.floor((now - bDate) / (1000 * 60 * 60 * 24)) + " Gün";
            }

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${v.chassis}</strong></td>
                <td>${v.model}</td>
                <td>${formatDate(v.bigBatteryDate)}</td>
                <td>${diffDays}</td>
                <td><span class="statusBadge ${v.smallBatteryConnected === 'yes' ? 'green' : 'red'}">${v.smallBatteryConnected === 'yes' ? 'Bağlı' : 'Kesik'}</span></td>
                <td><span class="statusBadge ${v.batteryRequired === 'yes' ? 'red' : 'green'}">${v.batteryRequired === 'yes' ? 'Şarj Yapılmalı' : 'Normal'}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn edit" onclick="editVehicle('${v.id}')" title="Düzenle"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="action-btn view" onclick="viewVehicleDetail('${v.id}')" title="Görüntüle"><i class="fa-solid fa-eye"></i></button>
                        <button class="action-btn delete" onclick="requestDeleteVehicle('${v.id}')" title="Sil"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </td>
            `;
            showroomBody.appendChild(tr);

            if (v.batteryRequired === 'yes' || v.smallBatteryConnected === 'no') dangerCount++;

        } else if (v.location === "parking") {
            parkingCount++;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${v.chassis}</strong></td>
                <td>${v.model}</td>
                <td>${formatDate(v.parkingDate)}</td>
                <td><span class="statusBadge ${v.parkingCheck10Days ? 'green' : 'yellow'}">${v.parkingCheck10Days ? 'Tamamlandı' : 'Bekliyor'}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn edit" onclick="editVehicle('${v.id}')" title="Düzenle"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="action-btn view" onclick="viewVehicleDetail('${v.id}')" title="Görüntüle"><i class="fa-solid fa-eye"></i></button>
                        <button class="action-btn delete" onclick="requestDeleteVehicle('${v.id}')" title="Sil"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </td>
            `;
            parkingBody.appendChild(tr);

            if (!v.parkingCheck10Days) dangerCount++;
        }
    });

    document.getElementById("totalVehicle").innerText = currentVehicles.length;
    document.getElementById("showroomCount").innerText = showroomCount;
    document.getElementById("parkingCount").innerText = parkingCount;
    document.getElementById("dangerVehicle").innerText = dangerCount;
}

// Modal Konum Değişimi Dinleyicisi
function handleLocationChangeInModal() {
    const loc = document.getElementById("vehicleLocation").value;
    const showroomGroup = document.getElementById("showroomFieldsGroup");
    const parkingGroup = document.getElementById("parkingFieldsGroup");

    if (loc === "parking") {
        showroomGroup.classList.add("hidden");
        parkingGroup.classList.remove("hidden");
    } else {
        showroomGroup.classList.remove("hidden");
        parkingGroup.classList.add("hidden");
    }
}

// Akü İki Tarih Alanı Gizleme/Gösterme
function toggleBatteryDateInputs() {
    const req = document.getElementById("batteryRequired").value;
    const wrapper = document.getElementById("batteryDatesWrapper");
    if (req === "yes") {
        wrapper.classList.remove("hidden");
    } else {
        wrapper.classList.add("hidden");
    }
}

// Araç Modalını Aç/Kapat
function openVehicleModal() {
    document.getElementById("vehicleModal").style.display = "flex";
    handleLocationChangeInModal();
}
function closeVehicleModal() {
    document.getElementById("vehicleModal").style.display = "none";
}

// Kaydetme İşlemi (Firebase)
async function handleSaveVehicle() {
    const chassis = document.getElementById("vehicleChassis").value.trim();
    const model = document.getElementById("vehicleModel").value.trim();
    const location = document.getElementById("vehicleLocation").value;
    const note = document.getElementById("vehicleNote").value.trim();

    if (!chassis || !model) {
        alert("Lütfen Şase No ve Model alanlarını doldurunuz.");
        return;
    }

    const { collection, addDoc } = window.fs;

    let payload = {
        chassis,
        model,
        location,
        createdAt: new Date().toISOString()
    };

    if (location === "showroom") {
        payload.ownership = document.getElementById("vehicleOwnership").value;
        payload.batteryRequired = document.getElementById("batteryRequired").value;
        payload.bigBatteryDate = document.getElementById("bigBatteryDate").value;
        payload.smallBatteryDate = document.getElementById("smallBatteryDate").value;
        payload.smallBatteryConnected = document.getElementById("smallBatteryConnected").value;
    } else {
        payload.parkingDate = document.getElementById("parkingDate").value;
        payload.parkingCheck10Days = document.getElementById("parkingCheck10Days").checked;
    }

    try {
        await addDoc(collection(window.db, "vehicles"), payload);

        // Log Kaydı
        await addDoc(collection(window.db, "logs"), {
            action: "Ekleme",
            chassis: chassis,
            details: `${model} - (${location.toUpperCase()}) sisteme eklendi. ${note ? 'Not: ' + note : ''}`,
            timestamp: new Date().toISOString()
        });

        closeVehicleModal();
    } catch (e) {
        alert("Hata oluştu: " + e.message);
    }
}

// Silme Talebi (Şifre Ekranı Açılır)
function requestDeleteVehicle(id) {
    pendingDeleteVehicleId = id;
    document.getElementById("deletePasswordInput").value = "";
    document.getElementById("deleteAuthModal").style.display = "flex";
}
function closeDeleteAuthModal() {
    document.getElementById("deleteAuthModal").style.display = "none";
    pendingDeleteVehicleId = null;
}

// Şifreli Silme Doğrulama
async function confirmVehicleDelete() {
    const pass = document.getElementById("deletePasswordInput").value;
    if (pass !== "meryem1" && pass !== "efe1") {
        alert("Hatalı şifre! Silme işlemi yetkiniz yok.");
        return;
    }

    if (!pendingDeleteVehicleId) return;

    const { doc, deleteDoc, collection, addDoc } = window.fs;
    const target = currentVehicles.find(v => v.id === pendingDeleteVehicleId);

    try {
        await deleteDoc(doc(window.db, "vehicles", pendingDeleteVehicleId));

        if (target) {
            await addDoc(collection(window.db, "logs"), {
                action: "Silme",
                chassis: target.chassis,
                details: `${target.model} kaydı silindi. (İşlemi yapan şifre kullanıcısı)`,
                timestamp: new Date().toISOString()
            });
        }

        closeDeleteAuthModal();
    } catch (e) {
        alert("Silinirken hata oluştu: " + e.message);
    }
}

// Özet İşlem Raporunu Göster (Sade/Modern Yapı)
async function openSummaryReportModal() {
    const { collection, getDocs } = window.fs;
    const snapshot = await getDocs(collection(window.db, "logs"));
    const container = document.getElementById("summaryReportContent");
    container.innerHTML = "";

    let logs = [];
    snapshot.forEach(doc => logs.push(doc.data()));
    
    // En yeni işlem en üstte
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (logs.length === 0) {
        container.innerHTML = "<p style='text-align:center; color: var(--text-secondary);'>Henüz yapılmış bir işlem kaydı bulunmamaktadır.</p>";
    } else {
        logs.forEach(log => {
            const actClass = log.action === "Ekleme" ? "add" : log.action === "Silme" ? "delete" : "update";
            const dateStr = new Date(log.timestamp).toLocaleString("tr-TR");

            const card = document.createElement("div");
            card.className = `logItemCard ${actClass}`;
            card.innerHTML = `
                <div>
                    <span class="logBadge ${actClass}">${log.action}</span>
                </div>
                <div style="flex:1;">
                    <div style="display:flex; justify-size:space-between; justify-content:space-between; margin-bottom: 2px;">
                        <strong>${log.chassis || 'Sistem'}</strong>
                        <small style="color:var(--text-secondary);">${dateStr}</small>
                    </div>
                    <div>${log.details}</div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    document.getElementById("summaryReportModal").style.display = "flex";
}
function closeSummaryReportModal() {
    document.getElementById("summaryReportModal").style.display = "none";
}

// Rapor İndirme Seçim Modalı
function openExportChoiceModal() {
    document.getElementById("exportChoiceModal").style.display = "flex";
}
function closeExportChoiceModal() {
    document.getElementById("exportChoiceModal").style.display = "none";
}

// Excel veya PDF İndirme İşleyicisi
function processExport(type) {
    if (type === 'excel') {
        exportToExcel();
    } else if (type === 'pdf') {
        exportToPDF();
    }
    closeExportChoiceModal();
}

// Excel Çıktısı Al
function exportToExcel() {
    const data = currentVehicles.map(v => ({
        "Şase No": v.chassis,
        "Marka Model": v.model,
        "Konum": v.location === "showroom" ? "Showroom" : "Otopark",
        "Mülkiyet": v.ownership || "-",
        "Otopark Çekilme Tarihi": formatDate(v.parkingDate),
        "10 Günlük Kontrol": v.parkingCheck10Days ? "Tamamlandı" : "Bekliyor"
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Araç Raporu");
    XLSX.writeFile(workbook, `Inciroglu_BMW_MINI_Rapor_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// PDF Çıktısı Al
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.text("İnciroğlu BMW / MINI - Akü Kontrol ve Stok Raporu", 14, 15);

    const tableRows = currentVehicles.map(v => [
        v.chassis,
        v.model,
        v.location === "showroom" ? "Showroom" : "Otopark",
        v.parkingDate ? formatDate(v.parkingDate) : "-",
        v.parkingCheck10Days ? "Evet" : "Hayır"
    ]);

    doc.autoTable({
        head: [['Şase No', 'Model', 'Konum', 'Otopark Tarihi', '10 G. Kontrol']],
        body: tableRows,
        startY: 20,
    });

    doc.save(`Inciroğlu_BMW_MINI_Rapor_${new Date().toISOString().slice(0,10)}.pdf`);
}

// Tema Değiştirici
function toggleTheme() {
    document.body.classList.toggle("dark-theme");
    document.body.classList.toggle("light-theme");
}
