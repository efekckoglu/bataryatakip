const modal = document.getElementById("vehicleModal");

const openBtns = [
    document.getElementById("openModal"),
    document.getElementById("newVehicle")
];

const closeBtn = document.getElementById("closeModal");
const cancelBtn = document.querySelector(".cancel");
const saveBtn = document.getElementById("saveVehicle");

const table = document.getElementById("vehicleTable");

let vehicles = JSON.parse(localStorage.getItem("vehicles")) || [];

openBtns.forEach(btn=>{
    btn.onclick = ()=> modal.classList.add("active");
});

closeBtn.onclick = ()=> modal.classList.remove("active");
cancelBtn.onclick = ()=> modal.classList.remove("active");

function saveStorage(){
    localStorage.setItem("vehicles",JSON.stringify(vehicles));
}

function updateDashboard(){

    document.getElementById("totalVehicle").innerText=vehicles.length;
    document.getElementById("normalVehicle").innerText=vehicles.length;
    document.getElementById("warningVehicle").innerText=0;
    document.getElementById("dangerVehicle").innerText=0;

}

function render(){

    table.innerHTML="";

    vehicles.forEach((v,index)=>{

        table.innerHTML+=`
        <tr>

        <td>${v.plate}</td>
        <td>${v.chassis}</td>
        <td>${v.model}</td>
        <td>${v.status}</td>
        <td>${v.fuel}</td>
        <td>${v.bigBattery}</td>
        <td>${v.smallBattery}</td>
        <td>${v.generalBattery}</td>

        <td>
        <span class="status good">Normal</span>
        </td>

        <td>

        <div class="actionButtons">

        <button class="deleteBtn" onclick="deleteVehicle(${index})">
        <i class="fa-solid fa-trash"></i>
        </button>

        </div>

        </td>

        </tr>
        `;
    });

    updateDashboard();

}

window.deleteVehicle=function(index){

    if(confirm("Araç silinsin mi?")){

        vehicles.splice(index,1);

        saveStorage();

        render();

    }

}

saveBtn.onclick=function(){

    const vehicle={

        plate:document.getElementById("plate").value,
        chassis:document.getElementById("chassis").value,
        model:document.getElementById("model").value,
        status:document.getElementById("status").value,
        fuel:document.getElementById("fuel").value,
        bigBattery:document.getElementById("bigBattery").value,
        smallBattery:document.getElementById("smallBattery").value,
        generalBattery:document.getElementById("generalBattery").value,
        note:document.getElementById("note").value

    };

    if(vehicle.plate==""){
        alert("Plaka giriniz");
        return;
    }

    vehicles.push(vehicle);

    saveStorage();

    render();

    modal.classList.remove("active");

    document.querySelectorAll(".modal input,.modal textarea").forEach(x=>x.value="");

}

render();