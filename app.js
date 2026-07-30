/* ==========================================================================
   İNCİROĞLU BMW/MINI - AKÜ KONTROL PANELİ (app.js)
   ========================================================================== */

let vehicles = [];
let editingVehicleId = null;
let currentDetailVehicleId = null;
let currentTheme = localStorage.getItem('theme') || 'light';

// Pop-up Şifre Onay Modalı Değişkenleri
let pendingAction = null; // 'delete' veya 'parkingCheck'
let pendingVehicleId = null;

// Şifre Listesi (Varsayılan efe1 ve meryem1)
let allowedDeletePasswords = JSON.parse(localStorage.getItem('bmw_passwords')) || ['efe1', 'meryem1'];

// Türkçe Karakter Düzeltme Fonksiyonu (PDF çıktıları için)
function trFix(text) {
    if (!text) return '';
    return String(text)
        .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
        .replace(/Ü/g, 'U').replace(/ü/g, 'u')
        .replace(/Ş/g, 'S').replace(/ş/g, 's')
        .replace(/İ/g, 'I').replace(/ı/g, 'i')
        .replace(/Ö/g, 'O').replace(/ö/g, 'o')
        .replace(/Ç/g, 'C').replace(/ç/g, 'c');
}

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
        setTimeout(initFirebaseListener, 300);
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
    today.setHours(0, 0, 0, 0);

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

            if (vehicle.batteryRequired === 'yes') {
                if (vehicle.bigBatteryDate) {
                    const bigDate = new Date(vehicle.bigBatteryDate);
                    bigDate.setHours(0, 0, 0, 0);
                    const diffTime = Math.abs(today - bigDate);
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    daysPassed = `${diffDays} Gün`;

                    // SHOWROOM BÜYÜK AKÜ KURALI: En geç 5 gün!
                    if (diffDays >= 5) {
                        bigStatusHTML = `<span class="statusBadge red"><i class="fa-solid fa-circle-exclamation"></i> Şarj Edilmeli (${diffDays} Gün)</span>`;
                        hasDanger = true;
                        addNotification(vehicle, `Showroom aracı ${diffDays} gündür büyük aküye bağlı (Sınır: 5 gün). Şarj kontrolü yapılmalıdır!`, 'danger');
                    } else if (diffDays >= 3) {
                        bigStatusHTML = `<span class="statusBadge yellow"><i class="fa-solid fa-triangle-exclamation"></i> Yaklaşıyor (${diffDays} Gün)</span>`;
                    } else {
                        bigStatusHTML = `<span class="statusBadge green"><i class="fa-solid fa-circle-check"></i> Uygun (${diffDays} Gün)</span>`;
                    }
                } else {
                    bigStatusHTML = `<span class="statusBadge yellow">Tarih Girilmedi</span>`;
                }

                // Küçük Akü Mantığı
                if (vehicle.smallBatteryDate) {
                    smallStatusHTML = `<span class="statusBadge green"><i class="fa-solid fa-link"></i> Bağlandı (${vehicle.smallBatteryDate})</span>`;
                } else {
                    smallStatusHTML = `<span class="statusBadge red"><i class="fa-solid fa-link-slash"></i> Bağlı Değil</span>`;
                    hasDanger = true;
                    addNotification(vehicle, `Showroom aracının küçük akü bağlantı tarihi girilmedi!`, 'danger');
                }
            } else {
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
                    <button class="actionBtn delete" onclick="openPasswordConfirmModal('delete', '${vehicle.id}')" title="Sil"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            showroomTable.appendChild(tr);

        } else if (vehicle.location === 'parking') {
            parkingCount++;
            const tr = document.createElement('tr');

            let parkDateText = vehicle.parkingDate || '-';
            let refDateStr = vehicle.lastBatteryCheckDate || vehicle.parkingDate || vehicle.createdAt;
            let statusHTML = '';
            let confirmCheckBtn = '';

            if (refDateStr) {
                const checkBaseDate = new Date(refDateStr);
                checkBaseDate.setHours(0, 0, 0, 0);
                const diffDays = Math.floor((today - checkBaseDate) / (1000 * 60 * 60 * 24));

                // OTOPARK AKÜ KURALI: 10 gün kontrol süresi
                if (diffDays >= 10) {
                    statusHTML = `<span class="statusBadge red"><i class="fa-solid fa-triangle-exclamation"></i> Kontrol Zamanı (${diffDays} Gün Oldu)</span>`;
                    hasDanger = true;
                    addNotification(vehicle, `Otopark aracının 10 günlük akü kontrol zamanı geldi! (${diffDays} Gün geçti)`, 'warning');
                    
                    // 10 günü geçtiğinde Onay Butonu çıkar
                    confirmCheckBtn = `<button class="actionBtn confirm" onclick="openPasswordConfirmModal('parkingCheck', '${vehicle.id}')" title="10 Günlük Kontrolü Onayla"><i class="fa-solid fa-check-double"></i></button>`;
                } else {
                    const remaining = 10 - diffDays;
                    statusHTML = `<span class="statusBadge green"><i class="fa-solid fa-check"></i> Kontrol Edildi (${remaining} Gün Kaldı)</span>`;
                }
            } else {
                statusHTML = `<span class="statusBadge yellow">Tarih Yok</span>`;
            }

            tr.innerHTML = `
                <td><strong>${vehicle.chassis || '-'}</strong></td>
                <td>${vehicle.model || '-'}</td>
                <td>${parkDateText}</td>
                <td>${statusHTML}</td>
                <td>
                    ${confirmCheckBtn}
                    <button class="actionBtn edit" onclick="openVehicleModal('${vehicle.id}')" title="Düzenle"><i class="fa-solid fa-pen"></i></button>
                    <button class="actionBtn detail" onclick="openDetailModal('${vehicle.id}')" title="Detaylar"><i class="fa-solid fa-eye"></i></button>
                    <button class="actionBtn delete" onclick="openPasswordConfirmModal('delete', '${vehicle.id}')" title="Sil"><i class="fa-solid fa-trash"></i></button>
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

// Bildirim Kartı
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

// Modal Konum Değişimi
function handleLocationChangeInModal() {
    const location = document.getElementById('vehicleLocation').value;
    const parkingDateGroup = document.getElementById('parkingDateGroup');
    const batteryRequiredGroup = document.getElementById('batteryRequiredGroup');
    const wrapper = document.getElementById('batteryDatesWrapper');

    if (location === 'parking') {
        parkingDateGroup.classList.remove('hidden');
        batteryRequiredGroup.classList.add('hidden');
        wrapper.classList.add('hidden');
    } else {
        parkingDateGroup.classList.add('hidden');
        batteryRequiredGroup.classList.remove('hidden');
        toggleBatteryDateInputs();
    }
}

function toggleBatteryDateInputs() {
    const location = document.getElementById('vehicleLocation').value;
    const required = document.getElementById('batteryRequired').value;
    const wrapper = document.getElementById('batteryDatesWrapper');

    if (location === 'showroom' && required === 'yes') {
        wrapper.classList.remove('hidden');
    } else {
        wrapper.classList.add('hidden');
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
        document.getElementById('vehicleNote').value = '';
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
        document.getElementById('vehicleNote').value = '';
    }

    handleLocationChangeInModal();
    modal.style.display = 'flex';
}

function closeVehicleModal() {
    document.getElementById('vehicleModal').style.display = 'none';
    editingVehicleId = null;
}

// Araç Kayıt / Düzenleme (Hata Düzeltildi & Firebase Tam Senkronize)
async function handleSaveVehicle() {
    const chassis = document.getElementById('vehicleChassis').value.trim();
    const model = document.getElementById('vehicleModel').value.trim();
    const ownership = document.getElementById('vehicleOwnership').value;
    const location = document.getElementById('vehicleLocation').value;
    const batteryRequired = document.getElementById('batteryRequired').value;
    const parkingDate = document.getElementById('parkingDate').value || null;
    const bigBatteryDate = document.getElementById('bigBatteryDate').value || null;
    const smallBatteryDate = document.getElementById('smallBatteryDate').value || null;
    const noteText = document.getElementById('vehicleNote').value.trim();

    if (!chassis || !model) {
        alert('Lütfen Şase No ve Model alanlarını doldurunuz.');
        return;
    }

    if (!window.db || !window.fs) {
        alert("Sistem veri bağlantısı bekleniyor, lütfen tekrar deneyin.");
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
            // ARAÇ DÜZENLEME İŞLEMİ
            const vRef = doc(window.db, 'vehicles', editingVehicleId);
            const currentV = vehicles.find(x => x.id === editingVehicleId);
            let updatedHistory = currentV && currentV.history ? [...currentV.history] : [];

            if (historyItem) updatedHistory.push(historyItem);

            const payload = {
                chassis: chassis,
                model: model,
                ownership: ownership,
                location: location,
                batteryRequired: location === 'showroom' ? batteryRequired : 'no',
                parkingDate: location === 'parking' ? parkingDate : null,
                bigBatteryDate: location === 'showroom' ? bigBatteryDate : null,
                smallBatteryDate: location === 'showroom' ? smallBatteryDate : null,
                smallBatteryConnected: (location === 'showroom' && smallBatteryDate) ? 'yes' : 'no',
                history: updatedHistory,
                updatedAt: nowIso
            };

            await updateDoc(vRef, payload);

        } else {
            // YENİ ARAÇ EKLEME
            let historyList = [];
            if (historyItem) historyList.push(historyItem);

            const payload = {
                chassis: chassis,
                model: model,
                ownership: ownership,
                location: location,
                batteryRequired: location === 'showroom' ? batteryRequired : 'no',
                parkingDate: location === 'parking' ? parkingDate : null,
                bigBatteryDate: location === 'showroom' ? bigBatteryDate : null,
                smallBatteryDate: location === 'showroom' ? smallBatteryDate : null,
                smallBatteryConnected: (location === 'showroom' && smallBatteryDate) ? 'yes' : 'no',
                lastBatteryCheckDate: location === 'parking' ? parkingDate : null,
                history: historyList,
                isDeleted: false,
                createdAt: nowIso,
                updatedAt: nowIso
            };

            await addDoc(collection(window.db, 'vehicles'), payload);
        }

        closeVehicleModal();
    } catch (err) {
        console.error("Kaydetme / Düzenleme Hatası:", err);
        alert("Kayıt güncellenirken bir hata oluştu: " + err.message);
    }
}

// ==========================================================================
// POP-UP ŞİFRE ONAY EKRANI YÖNETİMİ
// ==========================================================================
function openPasswordConfirmModal(actionType, vehicleId) {
    pendingAction = actionType;
    pendingVehicleId = vehicleId;

    const modal = document.getElementById('passwordConfirmModal');
    const title = document.getElementById('passwordModalTitle');
    const desc = document.getElementById('passwordModalDesc');
    const input = document.getElementById('confirmPasswordInput');

    input.value = '';

    if (actionType === 'delete') {
        title.innerHTML = `<i class="fa-solid fa-trash-can" style="color: var(--status-red);"></i> Araç Silme Onayı`;
        desc.innerText = "Bu aracı sistemden silmek üzeresiniz. Lütfen yetkili şifrenizi giriniz:";
    } else if (actionType === 'parkingCheck') {
        title.innerHTML = `<i class="fa-solid fa-check-double" style="color: var(--status-green);"></i> 10 Günlük Akü Kontrol Onayı`;
        desc.innerText = "Otopark aracının 10 günlük akü kontrolünü tamamlamak için yetkili şifrenizi giriniz:";
    }

    modal.style.display = 'flex';
}

function closePasswordConfirmModal() {
    document.getElementById('passwordConfirmModal').style.display = 'none';
    pendingAction = null;
    pendingVehicleId = null;
}

async function executePasswordConfirmedAction() {
    const inputPass = document.getElementById('confirmPasswordInput').value.trim();

    if (!inputPass) {
        alert("Lütfen şifrenizi giriniz!");
        return;
    }

    if (!allowedDeletePasswords.includes(inputPass)) {
        alert("Hatalı Yetkili Şifresi!");
        return;
    }

    const { updateDoc, doc } = window.fs;
    const formattedDate = new Date().toLocaleDateString('tr-TR') + ' ' + new Date().toLocaleTimeString('tr-TR');
    const currentV = vehicles.find(x => x.id === pendingVehicleId);

    if (!currentV) {
        closePasswordConfirmModal();
        return;
    }

    try {
        const vRef = doc(window.db, 'vehicles', pendingVehicleId);
        let updatedHistory = currentV.history ? [...currentV.history] : [];

        if (pendingAction === 'delete') {
            updatedHistory.push({ date: formattedDate, note: `Araç silindi (Yetkili Şifresi: ${inputPass}).` });
            await updateDoc(vRef, {
                isDeleted: true,
                deletedAt: new Date().toISOString(),
                history: updatedHistory
            });
        } else if (pendingAction === 'parkingCheck') {
            const todayStr = new Date().toISOString().split('T')[0];
            updatedHistory.push({ date: formattedDate, note: `10 Günlük Otopark Akü Kontrolü Onaylandı (Yetkili Şifresi: ${inputPass}).` });

            await updateDoc(vRef, {
                lastBatteryCheckDate: todayStr,
                history: updatedHistory,
                updatedAt: new Date().toISOString()
            });
        }

        closePasswordConfirmModal();
    } catch (err) {
        console.error("İşlem Hatası:", err);
        alert("İşlem gerçekleştirilemedi: " + err.message);
    }
}

// Detay Modalı
function openDetailModal(vehicleId) {
    currentDetailVehicleId = vehicleId;
    const v = vehicles.find(x => x.id === vehicleId);
    if (!v) return;

    document.getElementById('detailChassis').innerText = v.chassis || '-';
    document.getElementById('detailModel').innerText = v.model || '-';
    document.getElementById('detailOwnership').innerText = (v.ownership || 'stok').toUpperCase();
    document.getElementById('detailLocation').innerText = v.location === 'showroom' ? 'Showroom' : 'Otopark';
    document.getElementById('detailBigDate').innerText = v.bigBatteryDate || 'Yok / Gerekli Değil';
    document.getElementById('detailSmallDate').innerText = v.smallBatteryDate || 'Bağlantı Yapılmadı';
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
        historyContainer.innerHTML = `<p style="color:var(--text-secondary); font-size:13px;">Kayıtlı işlem/not bulunmuyor.</p>`;
    }

    document.getElementById('detailModal').style.display = 'flex';
}

function closeDetailModal() {
    document.getElementById('detailModal').style.display = 'none';
    currentDetailVehicleId = null;
}

// ==========================================================================
// YATAY (LANDSCAPE) PROFESYONEL PDF RAPORU OLUŞTURMA (Türkçe Karakter Düzeltmeli)
// ==========================================================================
function exportLandscapePDF() {
    if (!window.jspdf) {
        alert("PDF Kütüphanesi yüklenemedi.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const todayStr = new Date().toLocaleDateString('tr-TR') + ' ' + new Date().toLocaleTimeString('tr-TR');

    doc.setFontSize(15);
    doc.setTextColor(2, 136, 209);
    doc.text(trFix("INCIROGLU BMW/MINI - GENEL ARAC AKU VE SUREC RAPORU"), 14, 15);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(trFix(`Rapor Tarihi: ${todayStr}`), 14, 21);
    doc.text(trFix(`Konum: Kayseri | Otomatik Sistem Ciktisi`), 14, 25);

    const activeVehicles = vehicles.filter(v => !v.isDeleted);
    const deletedVehicles = vehicles.filter(v => v.isDeleted);

    // Aktif Araçlar Data
    const activeRows = activeVehicles.map(v => {
        const historyText = (v.history || []).map(h => `[${h.date}] ${h.note}`).join('\n') || 'Not yok';
        return [
            trFix(v.chassis || '-'),
            trFix(v.model || '-'),
            v.location === 'showroom' ? 'Showroom' : 'Otopark',
            trFix(v.bigBatteryDate || 'Gerekli Degil'),
            trFix(v.smallBatteryDate || 'Girilmedi'),
            trFix(historyText)
        ];
    });

    doc.autoTable({
        startY: 30,
        head: [[
            trFix('Sase No (VIN)'), 
            trFix('Marka & Model'), 
            trFix('Konum'), 
            trFix('En Son Buyuk Aku Tarihi'), 
            trFix('Kucuk Aku Tarihi'), 
            trFix('Arac Surec Notlari & Islem Gecmisi')
        ]],
        body: activeRows,
        styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
        headStyles: { fillColor: [2, 136, 209], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 40 },
            2: { cellWidth: 25 },
            3: { cellWidth: 35 },
            4: { cellWidth: 30 },
            5: { cellWidth: 104 }
        }
    });

    let finalY = doc.lastAutoTable.finalY + 12;

    if (finalY > 160) {
        doc.addPage();
        finalY = 20;
    }

    // Silinen Araçlar Data
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38);
    doc.text(trFix("SILINEN ARACLAR SISTEM KAYDI"), 14, finalY);

    const deletedRows = deletedVehicles.map(v => {
        const historyText = (v.history || []).map(h => `[${h.date}] ${h.note}`).join('\n') || 'Silindi';
        return [
            trFix(v.chassis || '-'),
            trFix(v.model || '-'),
            trFix(v.bigBatteryDate || '-'),
            trFix(v.smallBatteryDate || '-'),
            trFix(historyText)
        ];
    });

    doc.autoTable({
        startY: finalY + 4,
        head: [[
            trFix('Sase No (VIN)'), 
            trFix('Marka & Model'), 
            trFix('En Son Buyuk Aku Tarihi'), 
            trFix('Kucuk Aku Tarihi'), 
            trFix('Silinme Sebebi / Islem Gecmisi')
        ]],
        body: deletedRows.length > 0 ? deletedRows : [[trFix('-'), trFix('-'), trFix('-'), trFix('-'), trFix('Silinen arac bulunmuyor.')]],
        styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
        headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [254, 242, 242] },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 45 },
            2: { cellWidth: 35 },
            3: { cellWidth: 35 },
            4: { cellWidth: 114 }
        }
    });

    doc.save(`Inciroglu_BMW_MINI_Aku_Raporu_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ==========================================================================
// SEÇİLİ TEK BİR ARACA ÖZEL PDF İNDİRME
// ==========================================================================
function exportCurrentVehiclePDF() {
    if (!currentDetailVehicleId) return;
    const v = vehicles.find(x => x.id === currentDetailVehicleId);
    if (!v) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const todayStr = new Date().toLocaleDateString('tr-TR') + ' ' + new Date().toLocaleTimeString('tr-TR');

    doc.setFontSize(15);
    doc.setTextColor(2, 136, 209);
    doc.text(trFix(`INCIROGLU BMW/MINI - ARAC SUREC TARAHCE RAPORU`), 14, 15);

    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text(trFix(`Arac: ${v.chassis} - ${v.model}`), 14, 22);
    doc.text(trFix(`Rapor Tarihi: ${todayStr}`), 14, 27);

    doc.autoTable({
        startY: 32,
        head: [[
            trFix('Sase No (VIN)'), 
            trFix('Marka / Model'), 
            trFix('Mulkiyet'), 
            trFix('Konum'), 
            trFix('En Son Buyuk Aku Tarihi'), 
            trFix('Kucuk Aku Tarihi'), 
            trFix('Durum')
        ]],
        body: [[
            trFix(v.chassis || '-'),
            trFix(v.model || '-'),
            trFix((v.ownership || 'stok').toUpperCase()),
            v.location === 'showroom' ? 'Showroom' : 'Otopark',
            trFix(v.bigBatteryDate || 'Girilmedi'),
            trFix(v.smallBatteryDate || 'Girilmedi'),
            v.isDeleted ? 'SILINDI' : 'AKIF'
        ]],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' }
    });

    let historyRows = (v.history || []).map(h => [trFix(h.date), trFix(h.note)]);
    if (historyRows.length === 0) {
        historyRows = [['-', trFix('Sisteme girildiginden bu yana henüz ozel bir not eklenmedi.')]];
    }

    doc.setFontSize(11);
    doc.setTextColor(2, 136, 209);
    doc.text(trFix("ARAC EKLEME ANINDAN ITIBAREN GERCEKLESEN TUM SURECLER & NOTLAR"), 14, doc.lastAutoTable.finalY + 12);

    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 16,
        head: [[trFix('Islem Tarihi / Saat'), trFix('Yapilan Islem ve Not Detayi')]],
        body: historyRows,
        styles: { fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
        headStyles: { fillColor: [2, 136, 209], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 219 }
        }
    });

    doc.save(`${trFix(v.chassis)}_Surec_Raporu.pdf`);
}

// ==========================================================================
// PROFESYONEL EXCEL RAPORU İNDİRME
// ==========================================================================
function exportExcelByRange(range) {
    const now = new Date();
    let startDate = new Date(0);

    if (range === '1week') startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    else if (range === '1month') startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    else if (range === '6months') startDate = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000));
    else if (range === '1year') startDate = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));

    const activeList = vehicles.filter(v => !v.isDeleted && new Date(v.createdAt || new Date()) >= startDate);
    const deletedList = vehicles.filter(v => v.isDeleted && new Date(v.createdAt || new Date()) >= startDate);

    if (activeList.length === 0 && deletedList.length === 0) {
        alert("Seçilen zaman aralığında indirecek veri bulunamadı.");
        return;
    }

    const activeRows = activeList.map(v => ({
        "Şase No (VIN)": v.chassis || '',
        "Marka & Model": v.model || '',
        "Konum": v.location === 'showroom' ? 'Showroom' : 'Otopark',
        "Mülkiyet": v.ownership || '',
        "En Son Büyük Aküye Bağlanma Tarihi": v.bigBatteryDate || 'Girilmedi',
        "Küçük Akü Bağlanma Tarihi": v.smallBatteryDate || 'Girilmedi',
        "Otopark Çekilme Tarihi": v.parkingDate || '',
        "Tüm Süreç Notları & Geçmiş": (v.history || []).map(h => `[${h.date}] ${h.note}`).join(' | ')
    }));

    const deletedRows = deletedList.map(v => ({
        "Şase No (VIN)": v.chassis || '',
        "Marka & Model": v.model || '',
        "Konum": v.location || '',
        "En Son Büyük Aküye Bağlanma Tarihi": v.bigBatteryDate || 'Girilmedi',
        "Küçük Akü Bağlanma Tarihi": v.smallBatteryDate || 'Girilmedi',
        "Tüm Süreç Notları / Silinme Notu": (v.history || []).map(h => `[${h.date}] ${h.note}`).join(' | ')
    }));

    const workbook = XLSX.utils.book_new();

    const wsActive = XLSX.utils.json_to_sheet(activeRows);
    wsActive['!cols'] = [{ wch: 22 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 25 }, { wch: 22 }, { wch: 70 }];
    XLSX.utils.book_append_sheet(workbook, wsActive, "Aktif Araçlar");

    const wsDeleted = XLSX.utils.json_to_sheet(deletedRows.length > 0 ? deletedRows : [{ "Durum": "Silinen araç bulunamadı." }]);
    wsDeleted['!cols'] = [{ wch: 22 }, { wch: 25 }, { wch: 12 }, { wch: 30 }, { wch: 25 }, { wch: 70 }];
    XLSX.utils.book_append_sheet(workbook, wsDeleted, "Silinen Araçlar");

    XLSX.writeFile(workbook, `Inciroglu_BMW_MINI_Aku_Raporu_${range}.xlsx`);
    closeExcelFilterModal();
}

// Özet Rapor Modalı
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
                <th>Tüm Geçmiş Notlar</th>
            </tr>
        </thead>
        <tbody>`;

    vehicles.forEach(v => {
        let historyStr = (v.history || []).map(h => `<strong>[${h.date}]</strong> ${h.note}`).join('<br>') || 'İşlem yok';
        html += `
            <tr>
                <td><strong>${v.chassis}</strong></td>
                <td>${v.model}</td>
                <td>${v.location}</td>
                <td>${v.isDeleted ? '<span class="statusBadge red">Silindi</span>' : '<span class="statusBadge green">Aktif</span>'}</td>
                <td style="font-size:12px; text-align:left;">${historyStr}</td>
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

function openExcelFilterModal() {
    document.getElementById('excelFilterModal').style.display = 'flex';
}

function closeExcelFilterModal() {
    document.getElementById('excelFilterModal').style.display = 'none';
}

// ==========================================================================
// YÖNETİCİ PANELİ VE ŞİFRE YÖNETİMİ
// ==========================================================================
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
        renderPasswordListInAdmin();
        document.getElementById('adminPanelModal').style.display = 'flex';
    } else {
        alert('Hatalı Yönetici Şifresi!');
    }
}

function closeAdminPanelModal() {
    document.getElementById('adminPanelModal').style.display = 'none';
}

function renderPasswordListInAdmin() {
    const container = document.getElementById('adminPasswordList');
    if (!container) return;

    container.innerHTML = '';
    allowedDeletePasswords.forEach((pass, index) => {
        const item = document.createElement('div');
        item.className = 'passBadgeItem';
        item.innerHTML = `
            <span><i class="fa-solid fa-key"></i> <strong>${pass}</strong></span>
            <button onclick="removePassword(${index})" title="Şifreyi Sil"><i class="fa-solid fa-xmark"></i></button>
        `;
        container.appendChild(item);
    });
}

function addNewPassword() {
    const input = document.getElementById('newPasswordInput');
    const newPass = input.value.trim();

    if (!newPass) {
        alert('Lütfen geçerli bir şifre giriniz.');
        return;
    }

    if (allowedDeletePasswords.includes(newPass)) {
        alert('Bu şifre zaten listede var.');
        return;
    }

    allowedDeletePasswords.push(newPass);
    localStorage.setItem('bmw_passwords', JSON.stringify(allowedDeletePasswords));
    input.value = '';
    renderPasswordListInAdmin();
}

function removePassword(index) {
    if (allowedDeletePasswords.length <= 1) {
        alert('En az bir adet geçerli şifre bulunmalıdır!');
        return;
    }
    allowedDeletePasswords.splice(index, 1);
    localStorage.setItem('bmw_passwords', JSON.stringify(allowedDeletePasswords));
    renderPasswordListInAdmin();
}

function downloadBackupJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(vehicles, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `bmw_mini_battery_backup_${new Date().toISOString().split('T')[0]}.json`);
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
