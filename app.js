/* ==========================================================
                BMW | MINI AKÜ TAKİP SİSTEMİ
========================================================== */

/* ==========================================================
                    DOM ELEMENTLERİ
========================================================== */

const vehicleTable = document.getElementById("vehicleTable");

const totalVehicle = document.getElementById("totalVehicle");
const normalVehicle = document.getElementById("normalVehicle");
const warningVehicle = document.getElementById("warningVehicle");
const dangerVehicle = document.getElementById("dangerVehicle");

const notificationArea = document.getElementById("notificationArea");

const todayDate = document.getElementById("todayDate");

/* ==========================================================
                        MODALLAR
========================================================== */

const vehicleModal = document.getElementById("vehicleModal");
const detailModal = document.getElementById("detailModal");

const openVehicleModal =
    document.getElementById("openVehicleModal");

const newVehicleButton =
    document.getElementById("newVehicleButton");

const closeModal =
    document.getElementById("closeModal");

const cancelVehicle =
    document.getElementById("cancelVehicle");

const closeDetail =
    document.getElementById("closeDetail");

const closeDetailModal =
    document.getElementById("closeDetailModal");

/* ==========================================================
                        FORM
========================================================== */

const vehicleChassis =
    document.getElementById("vehicleChassis");

const vehicleModel =
    document.getElementById("vehicleModel");

const chargeNeed =
    document.getElementById("chargeNeed");

const bigBatteryDate =
    document.getElementById("bigBatteryDate");

const smallBatteryDate =
    document.getElementById("smallBatteryDate");

const vehicleNote =
    document.getElementById("vehicleNote");

const saveVehicle =
    document.getElementById("saveVehicle");

/* ==========================================================
                    DETAY ALANLARI
========================================================== */

const detailChassis =
    document.getElementById("detailChassis");

const detailModel =
    document.getElementById("detailModel");

const detailNeed =
    document.getElementById("detailNeed");

const bigBatteryHistory =
    document.getElementById("bigBatteryHistory");

const smallBatteryHistory =
    document.getElementById("smallBatteryHistory");

const vehicleNotes =
    document.getElementById("vehicleNotes");

/* ==========================================================
                    GLOBAL DEĞİŞKENLER
========================================================== */

let vehicles = [];

let selectedVehicle = null;

let editIndex = -1;

/* ==========================================================
                    LOCAL STORAGE
========================================================== */

const STORAGE_KEY = "bmwMiniBatterySystem";

function loadVehicles() {

    const data =
        localStorage.getItem(STORAGE_KEY);

    if (data) {

        vehicles = JSON.parse(data);

    }

}

function saveVehicles() {

    localStorage.setItem(

        STORAGE_KEY,

        JSON.stringify(vehicles)

    );

}

/* ==========================================================
                    TARİH
========================================================== */

function loadTodayDate() {

    const now = new Date();

    todayDate.textContent =
        now.toLocaleDateString("tr-TR", {

            weekday: "long",

            year: "numeric",

            month: "long",

            day: "numeric"

        });

}

/* ==========================================================
                GÜN HESAPLAMA
========================================================== */

function calculateDays(date) {

    if (!date) return 0;

    const today = new Date();

    const selected = new Date(date);

    const difference =
        today - selected;

    return Math.floor(

        difference /

        (1000 * 60 * 60 * 24)

    );

}

/* ==========================================================
                GÜN RENGİ
========================================================== */

function getDayColor(days) {

    if (days <= 3) {

        return "green";

    }

    if (days <= 6) {

        return "yellow";

    }

    return "red";

}

/* ==========================================================
                ŞARJ DURUMU
========================================================== */

function getChargeText(value) {

    if (value === "yes") {

        return "Şarj Gerekli";

    }

    return "Şarj Gerekmiyor";

}

/* ==========================================================
                    TARİH FORMATI
========================================================== */

function formatDate(date) {

    if (!date) return "-";

    return new Date(date)

        .toLocaleDateString("tr-TR");

}

/* ==========================================================
                    MODAL
========================================================== */

function openModal(modal) {

    modal.classList.add("active");

}

function closeModalWindow(modal) {

    modal.classList.remove("active");

}

/* ==========================================================
                FORM TEMİZLE
========================================================== */

function clearForm() {

    vehicleChassis.value = "";

    vehicleModel.value = "";

    chargeNeed.value = "yes";

    bigBatteryDate.value = "";

    smallBatteryDate.value = "";

    vehicleNote.value = "";

    editIndex = -1;

}

/* ==========================================================
                SAYFA YÜKLENDİĞİNDE
========================================================== */

document.addEventListener(

    "DOMContentLoaded",

    () => {

        loadTodayDate();

        loadVehicles();

    }

);

/* ==========================================================
                ARAÇ LİSTESİNİ OLUŞTUR
========================================================== */

function renderVehicles() {

    vehicleTable.innerHTML = "";

    vehicles.forEach((vehicle, index) => {

        const bigDays = calculateDays(vehicle.bigBatteryDate);

        const smallDays = calculateDays(vehicle.smallBatteryDate);

        const row = document.createElement("tr");

        row.innerHTML = `

            <td>${vehicle.chassis}</td>

            <td>${vehicle.model}</td>

            <td>

                <span class="${vehicle.chargeNeed === "yes" ? "needCharge" : "noCharge"}">

                    ${getChargeText(vehicle.chargeNeed)}

                </span>

            </td>

            <td>

                ${formatDate(vehicle.bigBatteryDate)}

            </td>

            <td>

                <span class="dayBadge ${getDayColor(bigDays)}">

                    ${bigDays} Gün

                </span>

            </td>

            <td>

                ${formatDate(vehicle.smallBatteryDate)}

            </td>

            <td>

                <span class="dayBadge ${getDayColor(smallDays)}">

                    ${smallDays} Gün

                </span>

            </td>

            <td>

                <div class="tableButtons">

                    <button
                        class="detailBtn"
                        onclick="showDetail(${index})">

                        <i class="fa-solid fa-eye"></i>

                    </button>

                    <button
                        class="editBtn"
                        onclick="editVehicle(${index})">

                        <i class="fa-solid fa-pen"></i>

                    </button>

                    <button
                        class="deleteBtn"
                        onclick="deleteVehicle(${index})">

                        <i class="fa-solid fa-trash"></i>

                    </button>

                </div>

            </td>

        `;

        vehicleTable.appendChild(row);

    });

    updateDashboard();

    updateNotifications();

}

/* ==========================================================
                YENİ ARAÇ KAYDET
========================================================== */

saveVehicle.addEventListener(

    "click",

    () => {

        const chassis = vehicleChassis.value.trim();

        const model = vehicleModel.value.trim();

        if (chassis === "" || model === "") {

            alert("Şase numarası ve model zorunludur.");

            return;

        }

        const vehicle = {

            chassis: chassis,

            model: model,

            chargeNeed: chargeNeed.value,

            bigBatteryDate: bigBatteryDate.value,

            smallBatteryDate: smallBatteryDate.value,

            note: vehicleNote.value,

            bigHistory: [

                {

                    date: bigBatteryDate.value,

                    note: "İlk kayıt"

                }

            ],

            smallHistory: [

                {

                    date: smallBatteryDate.value,

                    note: "İlk kayıt"

                }

            ],

            notes: [

                {

                    date: new Date().toISOString(),

                    text: vehicleNote.value

                }

            ]

        };

        if (editIndex === -1) {

            vehicles.push(vehicle);

        }

        else {

            vehicles[editIndex] = vehicle;

        }

        saveVehicles();

        renderVehicles();

        clearForm();

        closeModalWindow(vehicleModal);

    }

);

/* ==========================================================
                MODAL AÇ
========================================================== */

openVehicleModal.addEventListener(

    "click",

    (e) => {

        e.preventDefault();

        clearForm();

        openModal(vehicleModal);

    }

);

newVehicleButton.addEventListener(

    "click",

    () => {

        clearForm();

        openModal(vehicleModal);

    }

);

/* ==========================================================
                MODAL KAPAT
========================================================== */

closeModal.addEventListener(

    "click",

    () => {

        closeModalWindow(vehicleModal);

    }

);

cancelVehicle.addEventListener(

    "click",

    () => {

        closeModalWindow(vehicleModal);

    }

);

closeDetail.addEventListener(

    "click",

    () => {

        closeModalWindow(detailModal);

    }

);

closeDetailModal.addEventListener(

    "click",

    () => {

        closeModalWindow(detailModal);

    }

);

/* ==========================================================
                SAYFA İLK AÇILIŞ
========================================================== */

document.addEventListener(

    "DOMContentLoaded",

    () => {

        loadTodayDate();

        loadVehicles();

        renderVehicles();

    }

);

/* ==========================================================
                DASHBOARD GÜNCELLE
========================================================== */

function updateDashboard() {

    totalVehicle.textContent = vehicles.length;

    let normal = 0;
    let warning = 0;
    let danger = 0;

    vehicles.forEach(vehicle => {

        const bigDays = calculateDays(vehicle.bigBatteryDate);

        const smallDays = calculateDays(vehicle.smallBatteryDate);

        const maxDays = Math.max(bigDays, smallDays);

        if (maxDays <= 3) {

            normal++;

        }

        else if (maxDays <= 6) {

            warning++;

        }

        else {

            danger++;

        }

    });

    normalVehicle.textContent = normal;

    warningVehicle.textContent = warning;

    dangerVehicle.textContent = danger;

}

/* ==========================================================
                BİLDİRİMLER
========================================================== */

function updateNotifications() {

    notificationArea.innerHTML = "";

    let notificationCount = 0;

    vehicles.forEach((vehicle) => {

        const bigDays = calculateDays(vehicle.bigBatteryDate);

        const smallDays = calculateDays(vehicle.smallBatteryDate);

        if (bigDays >= 4) {

            createNotification(

                vehicle,

                "Büyük Akü",

                bigDays

            );

            notificationCount++;

        }

        if (smallDays >= 4) {

            createNotification(

                vehicle,

                "Küçük Akü",

                smallDays

            );

            notificationCount++;

        }

    });

    if (notificationCount === 0) {

        notificationArea.innerHTML = `

            <div class="notificationCard">

                <div class="notificationLeft">

                    <i class="fa-solid fa-circle-check"></i>

                </div>

                <div class="notificationContent">

                    <h3>

                        Bildirim Yok

                    </h3>

                    <p>

                        Şu anda kontrol edilmesi gereken araç bulunmuyor.

                    </p>

                </div>

            </div>

        `;

    }

}

/* ==========================================================
                TEK BİLDİRİM OLUŞTUR
========================================================== */

function createNotification(

    vehicle,

    battery,

    days

) {

    const type = days >= 7

        ? "danger"

        : "warning";

    const icon = days >= 7

        ? "fa-circle-exclamation"

        : "fa-bell";

    const card = document.createElement("div");

    card.className = `notificationCard ${type}`;

    card.innerHTML = `

        <div class="notificationLeft">

            <i class="fa-solid ${icon}"></i>

        </div>

        <div class="notificationContent">

            <h3>

                ${vehicle.model}

            </h3>

            <p>

                ${battery}

                <strong>${days} gündür</strong>

                şarja bağlanmadı.

            </p>

        </div>

    `;

    notificationArea.appendChild(card);

}

/* ==========================================================
                AKÜ DURUMU
========================================================== */

function getBatteryStatus(days) {

    if (days <= 3) {

        return {

            text: "Normal",

            color: "green"

        };

    }

    if (days <= 6) {

        return {

            text: "Yaklaşıyor",

            color: "yellow"

        };

    }

    return {

        text: "Kritik",

        color: "red"

    };

}

/* ==========================================================
                TOPLAM KRİTİK SAYISI
========================================================== */

function getCriticalVehicleCount() {

    return vehicles.filter(vehicle => {

        return (

            calculateDays(vehicle.bigBatteryDate) >= 7 ||

            calculateDays(vehicle.smallBatteryDate) >= 7

        );

    }).length;

}

/* ==========================================================
                TOPLAM UYARI SAYISI
========================================================== */

function getWarningVehicleCount() {

    return vehicles.filter(vehicle => {

        const big = calculateDays(vehicle.bigBatteryDate);

        const small = calculateDays(vehicle.smallBatteryDate);

        return (

            (big >= 4 && big <= 6) ||

            (small >= 4 && small <= 6)

        );

    }).length;

}

/* ==========================================================
                PANELİ YENİLE
========================================================== */

function refreshSystem() {

    renderVehicles();

    updateDashboard();

    updateNotifications();

}

/* ==========================================================
                ARAÇ SİL
========================================================== */

function deleteVehicle(index) {

    const confirmDelete = confirm(

        "Bu aracı silmek istediğinize emin misiniz?"

    );

    if (!confirmDelete) return;

    vehicles.splice(index, 1);

    saveVehicles();

    refreshSystem();

}

/* ==========================================================
                ARAÇ DÜZENLE
========================================================== */

function editVehicle(index) {

    const vehicle = vehicles[index];

    editIndex = index;

    vehicleChassis.value = vehicle.chassis;

    vehicleModel.value = vehicle.model;

    chargeNeed.value = vehicle.chargeNeed;

    bigBatteryDate.value = vehicle.bigBatteryDate;

    smallBatteryDate.value = vehicle.smallBatteryDate;

    vehicleNote.value = vehicle.note || "";

    openModal(vehicleModal);

}

/* ==========================================================
                DETAY GÖSTER
========================================================== */

function showDetail(index) {

    selectedVehicle = index;

    const vehicle = vehicles[index];

    detailChassis.textContent = vehicle.chassis;

    detailModel.textContent = vehicle.model;

    detailNeed.textContent = getChargeText(vehicle.chargeNeed);

    loadBigBatteryHistory(vehicle);

    loadSmallBatteryHistory(vehicle);

    loadVehicleNotes(vehicle);

    openModal(detailModal);

}

/* ==========================================================
            BÜYÜK AKÜ GEÇMİŞİ
========================================================== */

function loadBigBatteryHistory(vehicle) {

    bigBatteryHistory.innerHTML = "";

    if (!vehicle.bigHistory || vehicle.bigHistory.length === 0) {

        bigBatteryHistory.innerHTML =

            "<p>Geçmiş kayıt bulunamadı.</p>";

        return;

    }

    vehicle.bigHistory.forEach(item => {

        const div = document.createElement("div");

        div.className = "historyItem";

        div.innerHTML = `

            <div class="historyDate">

                ${formatDate(item.date)}

            </div>

            <div class="historyInfo">

                <h4>

                    Büyük Akü Güncellemesi

                </h4>

                <p>

                    ${item.note}

                </p>

            </div>

        `;

        bigBatteryHistory.appendChild(div);

    });

}

/* ==========================================================
            KÜÇÜK AKÜ GEÇMİŞİ
========================================================== */

function loadSmallBatteryHistory(vehicle) {

    smallBatteryHistory.innerHTML = "";

    if (!vehicle.smallHistory || vehicle.smallHistory.length === 0) {

        smallBatteryHistory.innerHTML =

            "<p>Geçmiş kayıt bulunamadı.</p>";

        return;

    }

    vehicle.smallHistory.forEach(item => {

        const div = document.createElement("div");

        div.className = "historyItem";

        div.innerHTML = `

            <div class="historyDate">

                ${formatDate(item.date)}

            </div>

            <div class="historyInfo">

                <h4>

                    Küçük Akü Güncellemesi

                </h4>

                <p>

                    ${item.note}

                </p>

            </div>

        `;

        smallBatteryHistory.appendChild(div);

    });

}

/* ==========================================================
                NOT GEÇMİŞİ
========================================================== */

function loadVehicleNotes(vehicle) {

    vehicleNotes.innerHTML = "";

    if (!vehicle.notes || vehicle.notes.length === 0) {

        vehicleNotes.innerHTML =

            "<p>Not bulunamadı.</p>";

        return;

    }

    vehicle.notes.forEach(item => {

        const div = document.createElement("div");

        div.className = "historyItem";

        div.innerHTML = `

            <div class="historyDate">

                ${formatDate(item.date)}

            </div>

            <div class="historyInfo">

                <h4>

                    Araç Notu

                </h4>

                <p>

                    ${item.text}

                </p>

            </div>

        `;

        vehicleNotes.appendChild(div);

    });

}

/* ==========================================================
            MODAL DIŞINA TIKLAYINCA KAPAT
========================================================== */

window.addEventListener("click", (event) => {

    if (event.target === vehicleModal) {

        closeModalWindow(vehicleModal);

    }

    if (event.target === detailModal) {

        closeModalWindow(detailModal);

    }

});

/* ==========================================================
                AKÜ GÜNCELLE
========================================================== */

const updateBattery =
    document.getElementById("updateBattery");

if (updateBattery) {

    updateBattery.addEventListener("click", () => {

        if (selectedVehicle === null) return;

        const vehicle = vehicles[selectedVehicle];

        const batteryType = prompt(
            "Hangi akü güncellenecek?\n(Büyük / Küçük)"
        );

        if (!batteryType) return;

        const note =
            prompt("İşlem notu giriniz:") || "Akü güncellendi.";

        const today = new Date().toISOString().split("T")[0];

        if (batteryType.toLowerCase() === "büyük") {

            vehicle.bigBatteryDate = today;

            vehicle.bigHistory.push({

                date: today,

                note: note

            });

        }

        else if (batteryType.toLowerCase() === "küçük") {

            vehicle.smallBatteryDate = today;

            vehicle.smallHistory.push({

                date: today,

                note: note

            });

        }

        else {

            alert("Geçersiz seçim.");

            return;

        }

        vehicle.notes.push({

            date: today,

            text: note

        });

        saveVehicles();

        refreshSystem();

        showDetail(selectedVehicle);

    });

}

/* ==========================================================
                ESC TUŞU
========================================================== */

document.addEventListener("keydown", (event) => {

    if (event.key === "Escape") {

        closeModalWindow(vehicleModal);

        closeModalWindow(detailModal);

    }

});

/* ==========================================================
                LOCAL STORAGE KONTROLÜ
========================================================== */

function initializeSystem() {

    loadTodayDate();

    loadVehicles();

    renderVehicles();

}

initializeSystem();

/* ==========================================================
                KONSOL BİLGİSİ
========================================================== */

console.log(

    "%cBMW | MINI Akü Takip Sistemi",

    "color:#0A84FF;font-size:18px;font-weight:bold;"

);

console.log(

    "Sistem başarıyla başlatıldı."

);

/* ==========================================================
                YARDIMCI FONKSİYONLAR
========================================================== */

function exportVehicles() {

    return JSON.stringify(

        vehicles,

        null,

        2

    );

}

function importVehicles(data) {

    try {

        vehicles = JSON.parse(data);

        saveVehicles();

        refreshSystem();

        return true;

    }

    catch {

        return false;

    }

}

function clearAllVehicles() {

    const answer = confirm(

        "Tüm araçlar silinsin mi?"

    );

    if (!answer) return;

    vehicles = [];

    saveVehicles();

    refreshSystem();

}

/* ==========================================================
                GELİŞTİRME İÇİN
========================================================== */

window.vehicleSystem = {

    vehicles,

    renderVehicles,

    refreshSystem,

    exportVehicles,

    importVehicles,

    clearAllVehicles

};
