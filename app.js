/* ==========================================================================
   İNCİROĞLU BMW - AKÜ KONTROL PANELİ (app.js)
   ========================================================================== */

let vehicles = [];
let editingVehicleId = null;
let currentTheme = localStorage.getItem('theme') || 'light';

// Sayfa Yüklendiğinde Başlat
document.addEventListener('DOMContentLoaded', () => {
    applyTheme(currentTheme);
    initTodayDate();
    initFirebaseListener();
});

// Tarih Formatlayıcı
function initTodayDate() {
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    const dateStr = today.toLocaleDateString('tr-TR', options);
    const dateEl = document.getElementById('todayDate');
    if (dateEl) dateEl.innerText = dateStr;
}

// Tema Yönetimi
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
    applyTheme(currentTheme);
}

function applyTheme(theme) {
    document.body.className = theme + '-theme';
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.className = theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }
}

// Firebase Realtime Dinleyici
function initFirebaseListener() {
    if (!window.db || !window.fs) {
        setTimeout(initFirebaseListener, 500);
        return;
    }

    const { collection, onSnapshot } = window.fs;
    const vehiclesRef = collection(window.db, 'vehicles');

    onSnapshot(vehiclesRef, (snapshot) => {
        vehicles = [];
        snapshot.forEach((doc) => {
            vehicles.push({ id: doc.id, ...doc.data() });
        });
        renderDashboard();
    }, (error) => {
        console.error("Firebase Veri Çekme Hatası:", error);
    });
}

// Dashboard ve Tablo Render Fonksiyonu
function renderDashboard() {
    const showroomTable = document.getElementById('showroomTableBody');
    const parkingTable = document.getElementById('parkingTableBody');
    const notificationArea = document.getElementById('notificationArea');

    if (!showroomTable || !parkingTable) return;

    showroomTable.innerHTML = '';
    parkingTable.innerHTML = '';
    notificationArea.innerHTML = '';

    let totalVehicles = vehicles.filter(v => !v.isDeleted).length;
    let showroomCount = 0;
    let parkingCount = 0;
    let dangerCount = 0;

    const today = new Date();

    vehicles.forEach((vehicle) => {
        if (vehicle.isDeleted) return;

        let hasDanger = false;

        if (vehicle.location === 'showroom') {
            showroomCount++;
            const tr = document.createElement('tr');

            let bigDateText = vehicle.bigBatteryDate || '-';
            let daysPassed = '-';
            let smallStatusHTML = '';
            let bigStatusHTML = '';

            // Akü bağlantısı gerekli seçilmişse
            if (vehicle.batteryRequired === 'yes') {
                if (vehicle.bigBatteryDate) {
                    const bigDate = new Date(vehicle.bigBatteryDate);
                    const diffTime = Math.abs(today - bigDate);
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    daysPassed = `${diffDays} Gün`;

                    if (diffDays >= 45) {
                        bigStatusHTML = `<span class="statusBadge red"><i class="fa-solid fa-circle-exclamation"></i> Şarj Edilmeli (${diffDays} Gün)</span>`;
                        hasDanger = true;
                        addNotification(vehicle, `Showroom aracı ${diffDays} gündür büyük aküye bağlı. Şarj kontrolü gerekli!`, 'danger');
                    } else if (diffDays >= 30) {
                        bigStatusHTML = `<span class="statusBadge yellow"><i class="fa-solid fa-triangle-exclamation"></i> Yaklaşıyor (${diffDays} Gün)</span>`;
                    } else {
                        bigStatusHTML = `<span class="statusBadge green"><i class="fa-solid fa-circle-check"></i> Uygun (${diffDays} Gün)</span>`;
                    }
                } else {
                    bigStatusHTML = `<span class="statusBadge yellow">Tarih Girilmedi</span>`;
                }

                if (vehicle.smallBatteryConnected === 'yes') {
                    smallStatusHTML = `<span class="statusBadge green"><i class="fa-solid fa-link"></i> Bağlı (Yeşil)</span>`;
                } else {
                    smallStatusHTML = `<span class="statusBadge red"><i class="fa-solid fa-link-slash"></i> Bağlı Değil (Kırmızı)</span>`;
                    hasDanger = true;
                    addNotification(vehicle, `Showroom aracının küçük akü bağlantısı yapılması gerekmektedir!`, 'danger');
                }
            } else {
                // Hayır (Gerekli Değil) seçilmişse
                bigStatusHTML = `<span class="statusBadge grey">Gerekli Değil</span>`;
                smallStatusHTML = `<span class="statusBadge grey">Gerekli Değil</span>`;
            }

            tr.innerHTML = `
                <td><strong>${vehicle.chassis || '-'}</strong></td>
                <td>${vehicle.model || '-'}</td>
                <td>${bigDateText}</td>
                <td>${daysPassed}</td>
                <td>${smallStatusHTML}</td>
                <td>${bigStatusHTML}</td>
                <td>
                    <button class="actionBtn edit" onclick="openVehicleModal('${vehicle.id}')" title="Düzenle"><i class="fa-solid fa-pen"></i></button>
                    <button class="actionBtn detail" onclick="openDetailModal('${vehicle.id}')" title="Detaylar"><i class="fa-solid fa-eye"></i></button>
                    <button class="actionBtn delete" onclick="deleteVehicle('${vehicle.id}')" title="Sil"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            showroomTable.appendChild(tr);

        } else if (vehicle.location === 'parking') {
            parkingCount++;
            const tr = document.createElement('tr');

            let parkDateText = vehicle.parkingDate || '-';
            let lastCheckText = vehicle.lastBatteryCheckDate || vehicle.parkingDate || '-';
            let statusHTML = '';
            let isChargeRequired = vehicle.batteryRequired === 'yes';

            if (isChargeRequired) {
                const checkBaseDate = new Date(vehicle.lastBatteryCheckDate || vehicle.parkingDate || vehicle.createdAt || new Date());
                const diffDays = Math.floor((today - checkBaseDate) / (1000 * 60 * 60 * 24));

                if (diffDays >= 10) {
                    statusHTML = `<span class="statusBadge red"><i class="fa-solid fa-triangle-exclamation"></i> 10 Günde Bir Akü Kontrol Et! (${diffDays} Gün Oldu)</span>`;
                    hasDanger = true;
                    addNotification(vehicle, `Otopark aracının 10 günlük akü kontrol zamanı geldi/geçti! (${diffDays} Gün)`, 'warning');
                } else {
                    statusHTML = `<span class="statusBadge green"><i class="fa-solid fa-check"></i> Kontrol Edildi (${diffDays} Gün Önce)</span>`;
                }
            } else {
                statusHTML = `<span class="statusBadge grey">Şarj Gerekli Değil</span>`;
            }

            tr.innerHTML = `
                <td><strong>${vehicle.chassis || '-'}</strong></td>
                <td>${vehicle.model || '-'}</td>
                <td>${isChargeRequired ? '<span class="statusBadge yellow">Şarj Gerekli</span>' : '<span class="statusBadge grey">Gerekli Değil</span>'}</td>
                <td>${parkDateText}</td>
                <td>${lastCheckText}</td>
                <td>${statusHTML}</td>
                <td>
                    <button class="actionBtn edit" onclick="openVehicleModal('${vehicle.id}')" title="Düzenle"><i class="fa-solid fa-pen"></i></button>
                    <button class="actionBtn detail" onclick="openDetailModal('${vehicle.id}')" title="Detaylar"><i class="fa-solid fa-eye"></i></button>
                    <button class="actionBtn delete" onclick="deleteVehicle('${vehicle.id}')" title="Sil"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            parkingTable.appendChild(tr);
        }

        if (hasDanger) dangerCount++;
    });

    document.getElementById('totalVehicle').innerText = totalVehicles;
    document.getElementById('showroomCount').innerText = showroomCount;
    document.getElementById('parkingCount').innerText = parkingCount;
    document.getElementById('dangerVehicle').innerText = dangerCount;

    if (notificationArea.children.length === 0) {
        notificationArea.innerHTML = `<div class="emptyNotify"><i class="fa-solid fa-shield-check"></i> Tümü Düzenli: Şu an müdahale gerektiren bir ikaz bulunmuyor.</div>`;
    }
}

// Bildirim Kartı Oluşturma
function addNotification(vehicle, message, type) {
    const notificationArea = document.getElementById('notificationArea');
    const card = document.createElement('div');
    card.className = `notifyCard ${type}`;
    card.innerHTML = `
        <div class="notifyIcon"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <div class="notifyBody">
            <strong>${vehicle.chassis} - ${vehicle.model}</strong>
            <p>${message}</p>
        </div>
        <button class="bmwBtnPrimary" onclick="openVehicleModal('${vehicle.id}')">Düzenle</button>
    `;
    notificationArea.appendChild(card);
}

// Modal Konum/Akü Alanı Kontrolleri
function handleLocationChangeInModal() {
    const location = document.getElementById('vehicleLocation').value;
    const parkingDateGroup = document.getElementById('parkingDateGroup');
    const parkingCheckGroup = document.getElementById('parkingCheckGroup');

    if (location === 'parking') {
        parkingDateGroup.classList.remove('hidden');
    } else {
        parkingDateGroup.classList.add('hidden');
        parkingCheckGroup.classList.add('hidden');
    }
    toggleBatteryDateInputs();
}

function toggleBatteryDateInputs() {
    const location = document.getElementById('vehicleLocation').value;
    const required = document.getElementById('batteryRequired').value;
    const wrapper = document.getElementById('batteryDatesWrapper');
    const bigBatteryGroup = document.getElementById('bigBatteryDateGroup');
    const parkingCheckGroup = document.getElementById('parkingCheckGroup');

    if (required === 'yes') {
        if (location === 'showroom') {
            wrapper.classList.remove('hidden');
            if (bigBatteryGroup) bigBatteryGroup.classList.remove('hidden');
            if (parkingCheckGroup) parkingCheckGroup.classList.add('hidden');
        } else { // Otopark
            wrapper.classList.add('hidden');
            if (parkingCheckGroup) parkingCheckGroup.classList.remove('hidden');
        }
    } else {
        wrapper.classList.add('hidden');
        if (parkingCheckGroup) parkingCheckGroup.classList.add('hidden');
    }
}

// Araç Modal Aç/Kapat
function openVehicleModal(vehicleId = null) {
    editingVehicleId = vehicleId;
    const modal = document.getElementById('vehicleModal');
    const title = document.getElementById('modalTitle');

    if (vehicleId) {
        const v = vehicles.find(x => x.id === vehicleId);
        if (!v) return;

        title.innerText = 'Araç Bilgilerini Düzenle';
        document.getElementById('vehicleChassis').value = v.chassis || '';
        document.getElementById('vehicleModel').value = v.model || '';
        document.getElementById('vehicleOwnership').value = v.ownership || 'stok';
        document.getElementById('vehicleLocation').value = v.location || 'showroom';
        document.getElementById('batteryRequired').value = v.batteryRequired || 'no';
        document.getElementById('parkingDate').value = v.parkingDate || '';
        document.getElementById('bigBatteryDate').value = v.bigBatteryDate || '';
        document.getElementById('smallBatteryDate').value = v.smallBatteryDate || '';
        document.getElementById('smallBatteryConnected').value = v.smallBatteryConnected || 'no';
        document.getElementById('vehicleNote').value = '';
        document.getElementById('parkingCheck10Days').checked = false;
    } else {
        title.innerText = 'Yeni Araç Ekle';
        document.getElementById('vehicleChassis').value = '';
        document.getElementById('vehicleModel').value = '';
        document.getElementById('vehicleOwnership').value = 'stok';
        document.getElementById('vehicleLocation').value = 'showroom';
        document.getElementById('batteryRequired').value = 'no';
        document.getElementById('parkingDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('bigBatteryDate').value = '';
        document.getElementById('smallBatteryDate').value = '';
        document.getElementById('smallBatteryConnected').value = 'no';
        document.getElementById('vehicleNote').value = '';
        document.getElementById('parkingCheck10Days').checked = false;
    }

    handleLocationChangeInModal();
    modal.style.display = 'flex';
}

function closeVehicleModal() {
    document.getElementById('vehicleModal').style.display = 'none';
    editingVehicleId = null;
}

// Araç Kayıt / Güncelleme İşlemi
async function handleSaveVehicle() {
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
    const is10DaysChecked = document.getElementById('parkingCheck10Days').checked;

    if (!chassis || !model) {
        alert('Lütfen Şase No ve Model alanlarını doldurunuz.');
        return;
    }

    const { collection, addDoc, updateDoc, doc } = window.fs;
    const nowIso = new Date().toISOString();
    const formattedDate = new Date().toLocaleDateString('tr-TR') + ' ' + new Date().toLocaleTimeString('tr-TR');

    let historyItem = null;
    if (noteText) {
        historyItem = { date: formattedDate, note: noteText };
    }

    try {
        if (editingVehicleId) {
            const vRef = doc(window.db, 'vehicles', editingVehicleId);
            const currentV = vehicles.find(x => x.id === editingVehicleId);
            let updatedHistory = currentV.history || [];

            if (historyItem) updatedHistory.push(historyItem);

            let lastCheck = currentV.lastBatteryCheckDate || null;
            if (location === 'parking' && is10DaysChecked) {
                lastCheck = new Date().toISOString().split('T')[0];
                updatedHistory.push({
                    date: formattedDate,
                    note: '10 Günlük Akü Kontrolü Yapıldı Olarak İşaretlendi.'
                });
            }

            await updateDoc(vRef, {
                chassis, model, ownership, location, batteryRequired,
                parkingDate: location === 'parking' ? parkingDate : null,
                bigBatteryDate: location === 'showroom' ? bigBatteryDate : null,
                smallBatteryDate: location === 'showroom' ? smallBatteryDate : null,
                smallBatteryConnected: location === 'showroom' ? smallBatteryConnected : 'no',
                lastBatteryCheckDate: lastCheck,
                history: updatedHistory,
                updatedAt: nowIso
            });

        } else {
            let historyList = [];
            if (historyItem) historyList.push(historyItem);

            let initialCheckDate = null;
            if (location === 'parking' && is10DaysChecked) {
                initialCheckDate = new Date().toISOString().split('T')[0];
            }

            await addDoc(collection(window.db, 'vehicles'), {
                chassis, model, ownership, location, batteryRequired,
                parkingDate: location === 'parking' ? parkingDate : null,
                bigBatteryDate: location === 'showroom' ? bigBatteryDate : null,
                smallBatteryDate: location === 'showroom' ? smallBatteryDate : null,
                smallBatteryConnected: location === 'showroom' ? smallBatteryConnected : 'no',
                lastBatteryCheckDate: initialCheckDate,
                history: historyList,
                isDeleted: false,
                createdAt: nowIso,
                updatedAt: nowIso
            });
        }

        closeVehicleModal();
    } catch (err) {
        console.error("Kaydetme Hatası:", err);
        alert("Kayıt sırasında hata oluştu: " + err.message);
    }
}

// Araç Silme
async function deleteVehicle(vehicleId) {
    if (!confirm("Bu aracı silmek istediğinize emin misiniz? (Raporlarda görünmeye devam edecektir)")) return;

    try {
        const { updateDoc, doc } = window.fs;
        const vRef = doc(window.db, 'vehicles', vehicleId);
        const formattedDate = new Date().toLocaleDateString('tr-TR') + ' ' + new Date().toLocaleTimeString('tr-TR');
        
        const currentV = vehicles.find(x => x.id === vehicleId);
        let updatedHistory = currentV.history || [];
        updatedHistory.push({ date: formattedDate, note: "Araç sistemden silindi." });

        await updateDoc(vRef, {
            isDeleted: true,
            deletedAt: new Date().toISOString(),
            history: updatedHistory
        });
    } catch (err) {
        console.error("Silme Hatası:", err);
    }
}

// Detay Modalı
function openDetailModal(vehicleId) {
    const v = vehicles.find(x => x.id === vehicleId);
    if (!v) return;

    document.getElementById('detailChassis').innerText = v.chassis || '-';
    document.getElementById('detailModel').innerText = v.model || '-';
    document.getElementById('detailOwnership').innerText = (v.ownership || 'stok').toUpperCase();
    document.getElementById('detailLocation').innerText = v.location === 'showroom' ? 'Showroom' : 'Otopark';
    document.getElementById('detailBigDate').innerText = v.bigBatteryDate || 'Yok / Gerekli Değil';
    document.getElementById('detailSmallDate').innerText = v.smallBatteryDate || 'Yok / Gerekli Değil';
    document.getElementById('detailParkDate').innerText = v.parkingDate || '-';

    const historyContainer = document.getElementById('detailNotesHistory');
    historyContainer.innerHTML = '';

    if (v.history && v.history.length > 0) {
        v.history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'historyItem';
            div.innerHTML = `<small>${item.date}</small><p>${item.note}</p>`;
            historyContainer.appendChild(div);
        });
    } else {
        historyContainer.innerHTML = `<p style="color:var(--text-secondary); font-size:13px;">Kayıtlı not bulunmuyor.</p>`;
    }

    document.getElementById('detailModal').style.display = 'flex';
}

function closeDetailModal() {
    document.getElementById('detailModal').style.display = 'none';
}

// Özet İşlem Raporu Modalı
function openSummaryReportModal() {
    const content = document.getElementById('summaryReportContent');
    content.innerHTML = '';

    let html = `<table>
        <thead>
            <tr>
                <th>Şase No</th>
                <th>Model</th>
                <th>Konum</th>
                <th>Durum</th>
                <th>Geçmiş İşlemler</th>
            </tr>
        </thead>
        <tbody>`;

    vehicles.forEach(v => {
        let historyStr = (v.history || []).map(h => `[${h.date}] ${h.note}`).join('<br>') || 'İşlem yok';
        html += `
            <tr>
                <td><strong>${v.chassis}</strong></td>
                <td>${v.model}</td>
                <td>${v.location}</td>
                <td>${v.isDeleted ? '<span class="statusBadge red">Silindi</span>' : '<span class="statusBadge green">Aktif</span>'}</td>
                <td style="font-size:12px; max-width:300px; text-align:left;">${historyStr}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    content.innerHTML = html;
    document.getElementById('summaryReportModal').style.display = 'flex';
}

function closeSummaryReportModal() {
    document.getElementById('summaryReportModal').style.display = 'none';
}

// Excel Filtreleme Modalı ve İndirme Mantığı
function openExcelFilterModal() {
    document.getElementById('excelFilterModal').style.display = 'flex';
}

function closeExcelFilterModal() {
    document.getElementById('excelFilterModal').style.display = 'none';
}

function exportExcelByRange(range) {
    const now = new Date();
    let startDate = new Date(0); // Tüm zamanlar için

    if (range === '1week') {
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    } else if (range === '1month') {
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    } else if (range === '6months') {
        startDate = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000));
    } else if (range === '1year') {
        startDate = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
    }

    const filteredData = vehicles.filter(v => {
        const itemDate = new Date(v.createdAt || v.updatedAt || new Date());
        return itemDate >= startDate;
    });

    if (filteredData.length === 0) {
        alert("Seçilen zaman aralığında indirecek veri bulunamadı.");
        return;
    }

    const excelRows = filteredData.map(v => ({
        "Şase No (VIN)": v.chassis || '',
        "Marka & Model": v.model || '',
        "Mülkiyet": v.ownership || '',
        "Konum": v.location || '',
        "Akü Şarj/Bağlantı Gerekli mi?": v.batteryRequired === 'yes' ? 'Evet' : 'Hayır',
        "Otopark Çekilme Tarihi": v.parkingDate || '',
        "Son Akü Kontrol Tarihi": v.lastBatteryCheckDate || '',
        "Büyük Akü Tarihi": v.bigBatteryDate || '',
        "Küçük Akü Tarihi": v.smallBatteryDate || '',
        "Küçük Akü Bağlı mı?": v.smallBatteryConnected === 'yes' ? 'Evet' : 'Hayır',
        "Durum": v.isDeleted ? 'Silindi' : 'Aktif',
        "Kayıt Tarihi": v.createdAt ? new Date(v.createdAt).toLocaleDateString('tr-TR') : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Aku_Raporu");

    XLSX.writeFile(workbook, `Inciroglu_BMW_Aku_Raporu_${range}.xlsx`);
    closeExcelFilterModal();
}

// Yönetici Panel İşlemleri
function openAdminLoginModal() {
    document.getElementById('adminLoginModal').style.display = 'flex';
}

function closeAdminLoginModal() {
    document.getElementById('adminLoginModal').style.display = 'none';
}

function handleAdminLogin() {
    const password = document.getElementById('adminPasswordInput').value;
    if (password === '1234' || password === 'admin') {
        closeAdminLoginModal();
        document.getElementById('adminPasswordInput').value = '';
        document.getElementById('adminPanelModal').style.display = 'flex';
    } else {
        alert('Hatalı Yönetici Şifresi!');
    }
}

function closeAdminPanelModal() {
    document.getElementById('adminPanelModal').style.display = 'none';
}

function downloadBackupJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(vehicles, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `bmw_battery_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

async function uploadBackupJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                const { collection, addDoc } = window.fs;
                for (const item of importedData) {
                    delete item.id;
                    await addDoc(collection(window.db, 'vehicles'), item);
                }
                alert('Yedek başarıyla içeri aktarıldı.');
                closeAdminPanelModal();
            }
        } catch (err) {
            alert('Geçersiz JSON dosyası!');
        }
    };
    reader.readAsText(file);
}

async function resetAllData() {
    if (!confirm("TÜM VERİLER SİLİNECEK! Emin misiniz?")) return;

    try {
        const { deleteDoc, doc } = window.fs;
        for (const v of vehicles) {
            await deleteDoc(doc(window.db, 'vehicles', v.id));
        }
        alert('Tüm veriler başarıyla sıfırlandı.');
        closeAdminPanelModal();
    } catch (err) {
        alert('Sıfırlama hatası: ' + err.message);
    }
}
