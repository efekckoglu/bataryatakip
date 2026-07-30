/**
 * İNCİROĞLU BMW / MINI - Akü Kontrol Paneli Uygulama Mantığı
 */

// Uygulama Durumu (State)
let state = {
    vehicles: [],
    logs: [],
    editingVehicleId: null,
    isAdminLoggedIn: false
};

// Sayfa Yüklendiğinde Başlat
document.addEventListener('DOMContentLoaded', () => {
    initDateDisplay();
    loadLocalFallbackData();
    setupFirestoreListener();
});

// Tarih Gösterimini Ayarla
function initDateDisplay() {
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    const dateStr = today.toLocaleDateString('tr-TR', options);
    const dateElem = document.getElementById('todayDate');
    if (dateElem) dateElem.textContent = dateStr;
}

// Tema Değiştirme
window.toggleTheme = function () {
    const body = document.body;
    const themeIcon = document.getElementById('themeIcon');
    if (body.classList.contains('light-theme')) {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        themeIcon.className = 'fa-solid fa-sun';
    } else {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        themeIcon.className = 'fa-solid fa-moon';
    }
};

// LocalStorage Fallback (Firebase bağlantısı olmadığında varsayılan çalışma)
function loadLocalFallbackData() {
    const localVehicles = localStorage.getItem('inciroglu_vehicles');
    const localLogs = localStorage.getItem('inciroglu_logs');

    if (localVehicles) state.vehicles = JSON.parse(localVehicles);
    if (localLogs) state.logs = JSON.parse(localLogs);

    renderApp();
}

function saveLocalData() {
    localStorage.setItem('inciroglu_vehicles', JSON.stringify(state.vehicles));
    localStorage.setItem('inciroglu_logs', JSON.stringify(state.logs));
}

// Firestore Canlı Dinleyici
function setupFirestoreListener() {
    if (window.db && window.fs && window.fs.onSnapshot) {
        try {
            const colRef = window.fs.collection(window.db, "vehicles");
            window.fs.onSnapshot(colRef, (snapshot) => {
                const firestoreVehicles = [];
                snapshot.forEach((doc) => {
                    firestoreVehicles.push({ id: doc.id, ...doc.data() });
                });
                if (firestoreVehicles.length > 0) {
                    state.vehicles = firestoreVehicles;
                    renderApp();
                }
            }, (error) => {
                console.warn("Firestore bağlantı hatası, yerel veriler kullanılıyor:", error);
            });
        } catch (e) {
            console.warn("Firestore başlatılamadı, yerel veri modunda çalışılıyor.", e);
        }
    }
}

// Yardımcı Hesaplamalar
function calculateDaysElapsed(startDateStr) {
    if (!startDateStr) return 0;
    const start = new Date(startDateStr);
    const now = new Date();
    const diffTime = Math.abs(now - start);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('tr-TR');
}

// Log Ekleme
function addSystemLog(actionType, detail) {
    const newLog = {
        id: Date.now().toString(),
        type: actionType, // 'add', 'update', 'delete', 'check'
        detail: detail,
        timestamp: new Date().toISOString()
    };
    state.logs.unshift(newLog);
    if (state.logs.length > 50) state.logs.pop();
    saveLocalData();
}

// Uygulama Arayüzünü Güncelleme
function renderApp() {
    renderDashboard();
    renderShowroomTable();
    renderParkingTable();
    renderNotifications();
}

function renderDashboard() {
    const total = state.vehicles.length;
    const showroom = state.vehicles.filter(v => v.location === 'showroom').length;
    const parking = state.vehicles.filter(v => v.location === 'parking').length;
    
    // İkazlı araçlar: Showroom'da küçük aküsü bağlı olmayanlar veya bağlantı süresi > 15 gün; Otoparkta 10 gündür kontrol edilmeyenler
    const dangerCount = state.vehicles.filter(v => {
        if (v.location === 'showroom') {
            return v.smallBatteryConnected === 'no' || (v.bigBatteryDate && calculateDaysElapsed(v.bigBatteryDate) > 15);
        } else if (v.location === 'parking') {
            return !v.parkingCheck10Days || calculateDaysElapsed(v.parkingDate) > 10;
        }
        return false;
    }).length;

    document.getElementById('totalVehicle').textContent = total;
    document.getElementById('showroomCount').textContent = showroom;
    document.getElementById('parkingCount').textContent = parking;
    document.getElementById('dangerVehicle').textContent = dangerCount;
}

function renderShowroomTable() {
    const tbody = document.getElementById('showroomTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const showroomList = state.vehicles.filter(v => v.location === 'showroom');

    if (showroomList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding:20px;">Showroom alanında henüz araç bulunmuyor.</td></tr>`;
        return;
    }

    showroomList.forEach(v => {
        const daysElapsed = calculateDaysElapsed(v.bigBatteryDate);
        const tr = document.createElement('tr');

        const smallBadge = v.smallBatteryConnected === 'yes'
            ? `<span class="badge-status badge-green"><i class="fa-solid fa-circle-check"></i> Bağlı</span>`
            : `<span class="badge-status badge-red"><i class="fa-solid fa-circle-xmark"></i> Bağlı Değil</span>`;

        const bigStatusBadge = v.batteryRequired === 'yes'
            ? `<span class="badge-status badge-yellow"><i class="fa-solid fa-plug"></i> Şarj/Bağlantı Gerekli</span>`
            : `<span class="badge-status badge-green"><i class="fa-solid fa-check"></i> Normal</span>`;

        tr.innerHTML = `
            <td><strong>${v.chassis}</strong></td>
            <td>${v.model}</td>
            <td>${formatDate(v.bigBatteryDate)}</td>
            <td><strong>${v.bigBatteryDate ? daysElapsed + ' gün' : '-'}</strong></td>
            <td>${smallBadge}</td>
            <td>${bigStatusBadge}</td>
            <td>
                <div class="btn-action-group">
                    <button class="btn-action btn-view" title="Detay" onclick="openDetailModal('${v.id}')"><i class="fa-solid fa-eye"></i></button>
                    <button class="btn-action btn-edit" title="Düzenle" onclick="openVehicleModal('${v.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="btn-action btn-delete" title="Sil" onclick="requestVehicleDelete('${v.id}')"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderParkingTable() {
    const tbody = document.getElementById('parkingTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const parkingList = state.vehicles.filter(v => v.location === 'parking');

    if (parkingList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding:20px;">Otopark alanında henüz araç bulunmuyor.</td></tr>`;
        return;
    }

    parkingList.forEach(v => {
        const tr = document.createElement('tr');
        const checkStatus = v.parkingCheck10Days
            ? `<span class="badge-status badge-green"><i class="fa-solid fa-circle-check"></i> Kontrol Edildi</span>`
            : `<span class="badge-status badge-red"><i class="fa-solid fa-triangle-exclamation"></i> Kontrol Bekliyor</span>`;

        tr.innerHTML = `
            <td><strong>${v.chassis}</strong></td>
            <td>${v.model}</td>
            <td>${formatDate(v.parkingDate)}</td>
            <td>${checkStatus}</td>
            <td>
                <div class="btn-action-group">
                    <button class="btn-action btn-view" title="Detay" onclick="openDetailModal('${v.id}')"><i class="fa-solid fa-eye"></i></button>
                    <button class="btn-action btn-edit" title="Düzenle" onclick="openVehicleModal('${v.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="btn-action btn-delete" title="Sil" onclick="requestVehicleDelete('${v.id}')"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderNotifications() {
    const notifArea = document.getElementById('notificationArea');
    if (!notifArea) return;
    notifArea.innerHTML = '';

    const warningVehicles = state.vehicles.filter(v => {
        if (v.location === 'showroom') return v.smallBatteryConnected === 'no' || (v.bigBatteryDate && calculateDaysElapsed(v.bigBatteryDate) > 15);
        if (v.location === 'parking') return !v.parkingCheck10Days;
        return false;
    });

    if (warningVehicles.length === 0) {
        notifArea.innerHTML = `
            <div style="text-align:center; padding: 15px; color: var(--status-green); font-size:13px; font-weight:600;">
                <i class="fa-solid fa-circle-check"></i> Tüm araç akü durumları stabil ve kontrol altında.
            </div>`;
        return;
    }

    warningVehicles.forEach(v => {
        const div = document.createElement('div');
        div.className = 'notifCard';
        let reason = v.location === 'showroom' 
            ? (v.smallBatteryConnected === 'no' ? 'Küçük akü bağlantısı kesik!' : 'Büyük akü şarj süresi 15 günü aştı!')
            : '10 günlük düzenli otopark akü kontrolü yapılması gerekiyor!';

        div.innerHTML = `
            <div class="notifInfo">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <div>
                    <strong>${v.model} (${v.chassis})</strong> - <span style="font-size:12px; color:var(--text-secondary);">${reason}</span>
                </div>
            </div>
            <button class="bmwBtnSecondary" style="padding:4px 10px; font-size:11px;" onclick="openDetailModal('${v.id}')">İncele</button>
        `;
        notifArea.appendChild(div);
    });
}

// MODAL İŞLEMLERİ: Araç Ekle/Düzenle
window.openVehicleModal = function (vehicleId = null) {
    state.editingVehicleId = vehicleId;
    const modal = document.getElementById('vehicleModal');
    const modalTitle = document.getElementById('modalTitle');

    if (vehicleId) {
        modalTitle.textContent = 'Araç Bilgilerini Düzenle';
        const v = state.vehicles.find(item => item.id === vehicleId);
        if (v) {
            document.getElementById('vehicleChassis').value = v.chassis || '';
            document.getElementById('vehicleModel').value = v.model || '';
            document.getElementById('vehicleOwnership').value = v.ownership || 'stok';
            document.getElementById('vehicleLocation').value = v.location || 'showroom';
            document.getElementById('batteryRequired').value = v.batteryRequired || 'no';
            document.getElementById('bigBatteryDate').value = v.bigBatteryDate || '';
            document.getElementById('smallBatteryDate').value = v.smallBatteryDate || '';
            document.getElementById('smallBatteryConnected').value = v.smallBatteryConnected || 'yes';
            document.getElementById('parkingDate').value = v.parkingDate || '';
            document.getElementById('parkingCheck10Days').checked = !!v.parkingCheck10Days;
            document.getElementById('vehicleNote').value = '';
        }
    } else {
        modalTitle.textContent = 'Yeni Araç Ekle';
        document.getElementById('vehicleChassis').value = '';
        document.getElementById('vehicleModel').value = '';
        document.getElementById('vehicleOwnership').value = 'stok';
        document.getElementById('vehicleLocation').value = 'showroom';
        document.getElementById('batteryRequired').value = 'no';
        document.getElementById('bigBatteryDate').value = '';
        document.getElementById('smallBatteryDate').value = '';
        document.getElementById('smallBatteryConnected').value = 'yes';
        document.getElementById('parkingDate').value = '';
        document.getElementById('parkingCheck10Days').checked = false;
        document.getElementById('vehicleNote').value = '';
    }

    handleLocationChangeInModal();
    toggleBatteryDateInputs();
    modal.style.display = 'flex';
};

window.closeVehicleModal = function () {
    document.getElementById('vehicleModal').style.display = 'none';
    state.editingVehicleId = null;
};

window.toggleBatteryDateInputs = function () {
    const req = document.getElementById('batteryRequired').value;
    const wrapper = document.getElementById('batteryDatesWrapper');
    if (req === 'yes') {
        wrapper.classList.remove('hidden');
    } else {
        wrapper.classList.add('hidden');
    }
};

window.handleSaveVehicle = async function () {
    const chassis = document.getElementById('vehicleChassis').value.trim();
    const model = document.getElementById('vehicleModel').value.trim();
    const ownership = document.getElementById('vehicleOwnership').value;
    const location = document.getElementById('vehicleLocation').value;
    const note = document.getElementById('vehicleNote').value.trim();

    if (!chassis || !model) {
        alert('Lütfen Şase No ve Araç Model alanlarını doldurunuz!');
        return;
    }

    const nowIso = new Date().toISOString();
    const newNoteObj = note ? [{ text: note, date: nowIso }] : [];

    let vehicleData = {
        chassis,
        model,
        ownership,
        location,
        batteryRequired: document.getElementById('batteryRequired').value,
        bigBatteryDate: document.getElementById('bigBatteryDate').value,
        smallBatteryDate: document.getElementById('smallBatteryDate').value,
        smallBatteryConnected: document.getElementById('smallBatteryConnected').value,
        parkingDate: document.getElementById('parkingDate').value,
        parkingCheck10Days: document.getElementById('parkingCheck10Days').checked,
        updatedAt: nowIso
    };

    if (state.editingVehicleId) {
        // Düzenleme
        const existingIndex = state.vehicles.findIndex(v => v.id === state.editingVehicleId);
        if (existingIndex > -1) {
            const existingNotes = state.vehicles[existingIndex].notes || [];
            vehicleData.notes = note ? [...existingNotes, ...newNoteObj] : existingNotes;
            vehicleData.id = state.editingVehicleId;
            state.vehicles[existingIndex] = vehicleData;

            // Firestore Güncelleme
            if (window.db && window.fs) {
                try {
                    const docRef = window.fs.doc(window.db, "vehicles", state.editingVehicleId);
                    await window.fs.updateDoc(docRef, vehicleData);
                } catch (e) { console.warn("Firestore güncelleme hatası:", e); }
            }
            addSystemLog('update', `${model} (${chassis}) bilgileri güncellendi.`);
        }
    } else {
        // Yeni Ekleme
        vehicleData.id = Date.now().toString();
        vehicleData.notes = newNoteObj;
        state.vehicles.push(vehicleData);

        // Firestore Ekleme
        if (window.db && window.fs) {
            try {
                const colRef = window.fs.collection(window.db, "vehicles");
                const docRef = await window.fs.addDoc(colRef, vehicleData);
                vehicleData.id = docRef.id;
            } catch (e) { console.warn("Firestore ekleme hatası:", e); }
        }
        addSystemLog('add', `Yeni araç eklendi: ${model} (${chassis})`);
    }

    saveLocalData();
    renderApp();
    closeVehicleModal();
};

// ARAÇ SİLME
window.executeVehicleDelete = async function (vehicleId, userName) {
    const targetVehicle = state.vehicles.find(v => v.id === vehicleId);
    if (!targetVehicle) return;

    state.vehicles = state.vehicles.filter(v => v.id !== vehicleId);

    if (window.db && window.fs) {
        try {
            const docRef = window.fs.doc(window.db, "vehicles", vehicleId);
            await window.fs.deleteDoc(docRef);
        } catch (e) { console.warn("Firestore silme hatası:", e); }
    }

    addSystemLog('delete', `${userName} tarafından ${targetVehicle.model} (${targetVehicle.chassis}) silindi.`);
    saveLocalData();
    renderApp();
};

// MODAL İŞLEMLERİ: Detay Gösterimi
window.openDetailModal = function (vehicleId) {
    const v = state.vehicles.find(item => item.id === vehicleId);
    if (!v) return;

    document.getElementById('detailChassis').textContent = v.chassis || '-';
    document.getElementById('detailModel').textContent = v.model || '-';
    document.getElementById('detailOwnership').textContent = (v.ownership || '-').toUpperCase();
    document.getElementById('detailLocation').textContent = (v.location || '-').toUpperCase();
    document.getElementById('detailBigDate').textContent = formatDate(v.bigBatteryDate);
    document.getElementById('detailSmallDate').textContent = formatDate(v.smallBatteryDate);
    document.getElementById('detailParkDate').textContent = formatDate(v.parkingDate);

    const historyContainer = document.getElementById('detailNotesHistory');
    historyContainer.innerHTML = '';

    if (v.notes && v.notes.length > 0) {
        v.notes.forEach(n => {
            const div = document.createElement('div');
            div.className = 'noteItem';
            div.innerHTML = `<strong>${formatDate(n.date)}:</strong> ${n.text}`;
            historyContainer.appendChild(div);
        });
    } else {
        historyContainer.innerHTML = `<span style="color:var(--text-muted); font-size:12px;">Geçmiş not bulunmuyor.</span>`;
    }

    document.getElementById('detailModal').style.display = 'flex';
};

window.closeDetailModal = function () {
    document.getElementById('detailModal').style.display = 'none';
};

// MODAL İŞLEMLERİ: Özet İşlem Raporu
window.openSummaryReportModal = function () {
    const container = document.getElementById('summaryReportContent');
    container.innerHTML = '';

    if (state.logs.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:13px;">Henüz bir işlem kaydedilmedi.</p>`;
    } else {
        state.logs.forEach(log => {
            const div = document.createElement('div');
            div.className = 'timeline-item';

            let badgeClass = 'badge-add';
            let badgeText = 'EKLEME';
            if (log.type === 'update') { badgeClass = 'badge-update'; badgeText = 'GÜNCELLEME'; }
            if (log.type === 'delete') { badgeClass = 'badge-delete'; badgeText = 'SİLME'; }

            div.innerHTML = `
                <span class="timeline-badge ${badgeClass}">${badgeText}</span>
                <div class="timeline-info">${log.detail}</div>
                <div class="timeline-time">${formatDate(log.timestamp)}</div>
            `;
            container.appendChild(div);
        });
    }
    document.getElementById('summaryReportModal').style.display = 'flex';
};

window.closeSummaryReportModal = function () {
    document.getElementById('summaryReportModal').style.display = 'none';
};

// MODAL İŞLEMLERİ: Excel / PDF İndirme
window.openExcelFilterModal = function () {
    document.getElementById('excelFilterModal').style.display = 'flex';
};

window.closeExcelFilterModal = function () {
    document.getElementById('excelFilterModal').style.display = 'none';
};

// EXCEL VE PDF RAPOR OLUŞTURUCU
window.generateReport = function (format, range) {
    let filteredVehicles = [...state.vehicles];
    const now = new Date();

    if (range === '1week') {
        filteredVehicles = filteredVehicles.filter(v => calculateDaysElapsed(v.updatedAt || v.parkingDate || v.bigBatteryDate) <= 7);
    } else if (range === '1month') {
        filteredVehicles = filteredVehicles.filter(v => calculateDaysElapsed(v.updatedAt || v.parkingDate || v.bigBatteryDate) <= 30);
    } else if (range === '6months') {
        filteredVehicles = filteredVehicles.filter(v => calculateDaysElapsed(v.updatedAt || v.parkingDate || v.bigBatteryDate) <= 180);
    }

    if (format === 'excel') {
        exportToExcel(filteredVehicles);
    } else if (format === 'pdf') {
        exportToPDF(filteredVehicles);
    }
};

function exportToExcel(data) {
    if (typeof XLSX === 'undefined') {
        alert("SheetJS kütüphanesi yüklenemedi.");
        return;
    }

    const excelData = data.map(v => ({
        'Şase No (VIN)': v.chassis,
        'Marka Model': v.model,
        'Mülkiyet': v.ownership,
        'Konum': v.location,
        'Büyük Akü Tarihi': formatDate(v.bigBatteryDate),
        'Küçük Akü Tarihi': formatDate(v.smallBatteryDate),
        'Küçük Akü Durumu': v.smallBatteryConnected === 'yes' ? 'Bağlı' : 'Bağlı Değil',
        'Otopark Tarihi': formatDate(v.parkingDate),
        'Otopark Kontrol': v.parkingCheck10Days ? 'Yapıldı' : 'Yapılmadı'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Akü Kontrol Raporu");
    XLSX.writeFile(workbook, `Inciroglu_Aku_Raporu_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function exportToPDF(data) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("jsPDF kütüphanesi yüklenemedi.");
        return;
    }

    const doc = new window.jspdf.jsPDF();
    doc.text("İnciroğlu BMW / MINI - Akü Kontrol Raporu", 14, 15);

    const tableRows = data.map(v => [
        v.chassis,
        v.model,
        v.location.toUpperCase(),
        formatDate(v.bigBatteryDate || v.parkingDate),
        v.location === 'showroom' ? (v.smallBatteryConnected === 'yes' ? 'Bağlı' : 'Kesik') : (v.parkingCheck10Days ? 'Tamam' : 'Bekliyor')
    ]);

    doc.autoTable({
        head: [['Şase No', 'Model', 'Konum', 'Tarih', 'Durum']],
        body: tableRows,
        startY: 22
    });

    doc.save(`Inciroglu_Aku_Raporu_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ADMIN VE PANEL İŞLEMLERİ
window.openAdminLoginModal = function () {
    document.getElementById('adminPasswordInput').value = '';
    document.getElementById('adminLoginModal').style.display = 'flex';
};

window.closeAdminLoginModal = function () {
    document.getElementById('adminLoginModal').style.display = 'none';
};

window.handleAdminLogin = function () {
    const pass = document.getElementById('adminPasswordInput').value.trim();
    if (pass === 'inciroglu2026' || pass === 'admin') {
        state.isAdminLoggedIn = true;
        closeAdminLoginModal();
        document.getElementById('adminPanelModal').style.display = 'flex';
    } else {
        alert('Hatalı Yönetici Şifresi!');
    }
};

window.closeAdminPanelModal = function () {
    document.getElementById('adminPanelModal').style.display = 'none';
};

// YEDEKLEME VE SIFIRLAMA
window.downloadBackupJSON = function () {
    const backupData = JSON.stringify(state, null, 2);
    const blob = new Blob([backupData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Inciroglu_Sistem_Yedegi_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
};

window.uploadBackupJSON = function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            const importedState = JSON.parse(event.target.result);
            if (importedState.vehicles) {
                state.vehicles = importedState.vehicles;
                if (importedState.logs) state.logs = importedState.logs;
                saveLocalData();
                renderApp();
                alert('Yedek başarıyla geri yüklendi!');
                closeAdminPanelModal();
            } else {
                alert('Geçersiz yedek dosyası formatı!');
            }
        } catch (err) {
            alert('Dosya okuma hatası oluştu!');
        }
    };
    reader.readAsText(file);
};

window.resetAllData = function () {
    if (confirm('TÜM ARAÇ VE LOG VERİLERİ SİLİNECEKTİR! Bu işlem geri alınamaz. Onaylıyor musunuz?')) {
        state.vehicles = [];
        state.logs = [];
        saveLocalData();
        renderApp();
        alert('Tüm veriler sıfırlandı.');
        closeAdminPanelModal();
    }
};
