let foods = JSON.parse(localStorage.getItem("foods")) || [];
let goal = localStorage.getItem("goal") || 0;

document.getElementById("goal").value = goal;
render();

function saveGoal() {
    goal = document.getElementById("goal").value;
    localStorage.setItem("goal", goal);
    render();
}

function addFood() {
    let name = document.getElementById("food").value;
    let cal = parseInt(document.getElementById("calories").value);

    if (!name || !cal) return;

    foods.push({ name, cal });
    localStorage.setItem("foods", JSON.stringify(foods));

    document.getElementById("food").value = "";
    document.getElementById("calories").value = "";

    render();
}

function deleteFood(index) {
    foods.splice(index, 1);
    localStorage.setItem("foods", JSON.stringify(foods));
    render();
}

function clearToday() {
    if (!confirm("Clear all entries for today?")) return;
    foods = [];
    localStorage.setItem("foods", "[]");
    render();
}

function render() {
    let list = document.getElementById("foodList");
    list.innerHTML = "";

    let total = 0;
    foods.forEach((f, i) => {
        total += f.cal;
        list.innerHTML += `
            <li>
                ${f.name} - ${f.cal} kcal
                <button onclick="deleteFood(${i})">X</button>
            </li>`;
    });

    let remaining = goal - total;
    let deficit = remaining > 0 ? remaining : 0;

    document.getElementById("total").textContent = total;
    document.getElementById("remaining").textContent = remaining;
    document.getElementById("deficit").textContent = deficit;

    let pct = goal > 0 ? (total / goal) * 100 : 0;
    document.getElementById("progressBar").style.width = pct + "%";
}

function calculateBMR() {
    let age = parseInt(document.getElementById("age").value);
    let height = parseInt(document.getElementById("height").value);
    let weight = parseInt(document.getElementById("weight").value);
    let gender = document.getElementById("gender").value;
    let activity = parseFloat(document.getElementById("activity").value);

    if (!age || !height || !weight) return;

    let bmr =
        gender === "male"
            ? 10 * weight + 6.25 * height - 5 * age + 5
            : 10 * weight + 6.25 * height - 5 * age - 161;

    let tdee = Math.round(bmr * activity);

    document.getElementById("bmrResult").innerHTML = `
        <p><strong>BMR:</strong> ${Math.round(bmr)} kcal/day</p>
        <p><strong>TDEE:</strong> ${tdee} kcal/day</p>
    `;
}
