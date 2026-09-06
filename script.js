/* =========================================================
   TheSocialsuits — script.js
   ใช้ร่วมกันทุกหน้า: product.html / order.html / admin.html
   ========================================================= */

/* ---------------------------------------------------------
   CONFIG
   --------------------------------------------------------- */
const PRODUCTS_JSON_PATH = "products.json";
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby8Z14w9q2XhyilSmfsnrQWD22g8ves_87aPFuxrXpCvtMGTDY-p3Ce_GAhK0N537fJ/exec";
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQY1gVjnXV529TeCxaUZi_f4oxDL9H0qyHv-BpK--drLTueCBGqjJ1YrOU_b8DjXSzx1FRM9YlSwjIQ/pub?gid=0&single=true&output=csv";

/* จับคู่ type ของสินค้า กับ class จุดสี (ต้องตรงกับ style.css) */
const TYPE_TAG_CLASS = {
  "สูท Tuxedo": "tag-tuxedo",
  "สูทสีกรมท่า": "tag-navy",
  "สูทสีเบจ": "tag-beige",
  "สูทสีชมพูพาสเทล": "tag-pink",
  "ชุดสูทสีน้ำตาล": "tag-brown",
};

/* ---------------------------------------------------------
   Helpers
   --------------------------------------------------------- */
function formatPrice(price) {
  // แสดงราคาแบบมีจุลภาค เช่น 3,000
  const num = Number(price);
  if (Number.isNaN(num)) return String(price);
  return num.toLocaleString("th-TH");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadProducts() {
  const res = await fetch(PRODUCTS_JSON_PATH);
  if (!res.ok) throw new Error("โหลด products.json ไม่สำเร็จ");
  const data = await res.json();
  return data.products || [];
}

/* =========================================================
   1) PRODUCT.HTML — แสดงสินค้า + ตัวกรอง
   ========================================================= */
function initProductPage() {
  const filterBar = document.querySelector("#filter-bar");
  const productList = document.querySelector("#product-list");
  if (!filterBar || !productList) return; // ไม่ใช่หน้านี้ ข้ามไป

  let allProducts = [];
  let currentFilter = "all";

  function renderFilterBar(products) {
    // ปุ่ม "ทั้งหมด" + ปุ่มตาม type ของสินค้าแต่ละรายการ (ไม่ซ้ำ)
    const types = [];
    products.forEach((p) => {
      if (!types.includes(p.type)) types.push(p.type);
    });

    filterBar.innerHTML = "";

    const allBtn = document.createElement("button");
    allBtn.className = "btn btn-ghost filter-btn active";
    allBtn.type = "button";
    allBtn.dataset.filter = "all";
    allBtn.textContent = "ทั้งหมด";
    filterBar.appendChild(allBtn);

    types.forEach((type) => {
      const btn = document.createElement("button");
      btn.className = "btn btn-ghost filter-btn";
      btn.type = "button";
      btn.dataset.filter = type;
      btn.textContent = type;
      filterBar.appendChild(btn);
    });

    filterBar.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentFilter = btn.dataset.filter;
        setActiveButton(currentFilter);
        renderProductList(allProducts, currentFilter);
      });
    });
  }

  function setActiveButton(filterValue) {
    filterBar.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.filter === filterValue);
    });
  }

  function buildProductCard(product) {
    const tagClass = TYPE_TAG_CLASS[product.type] || "";
    const sizeOptions = (product.size || [])
      .map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
      .join("");

    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <img class="product-card__image" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">
      <div class="product-card__body">
        <span class="product-card__tag ${tagClass}">${escapeHtml(product.type)}</span>
        <h3 class="product-card__name">${escapeHtml(product.name)}</h3>
        <p class="product-card__desc">${escapeHtml(product.description || "")}</p>

        <label style="font-size:0.78rem;color:var(--color-brown-soft);letter-spacing:0.05em;">
          เลือกไซส์
          <select class="size-select" style="display:block;margin-top:0.3rem;width:100%;padding:0.5rem;border:1px solid var(--color-line);border-radius:var(--radius-sm);background:var(--color-white);">
            ${sizeOptions}
          </select>
        </label>

        <div class="product-card__footer">
          <span class="product-card__price">฿${formatPrice(product.price)}</span>
          <a class="btn btn-primary order-link" href="#">สั่งซื้อ</a>
        </div>
      </div>
    `;

    const select = card.querySelector(".size-select");
    const orderLink = card.querySelector(".order-link");

    function updateOrderLink() {
      const size = select.value;
      const itemText = `${product.name} Size ${size}`;
      const priceText = formatPrice(product.price);
      const url = `order.html?item=${encodeURIComponent(itemText)}&price=${encodeURIComponent(priceText)}`;
      orderLink.setAttribute("href", url);
    }

    select.addEventListener("change", updateOrderLink);
    updateOrderLink();

    return card;
  }

  function renderProductList(products, filterValue) {
    const filtered =
      filterValue === "all" ? products : products.filter((p) => p.type === filterValue);

    productList.innerHTML = "";

    if (filtered.length === 0) {
      productList.innerHTML = `<p style="grid-column:1/-1;text-align:center;">ไม่พบสินค้าในหมวดนี้</p>`;
      return;
    }

    filtered.forEach((product) => {
      productList.appendChild(buildProductCard(product));
    });
  }

  function applyFilterFromUrl(products) {
    const params = new URLSearchParams(window.location.search);
    const listParam = params.get("list");
    if (!listParam) {
      currentFilter = "all";
      return;
    }
    const decoded = decodeURIComponent(listParam).trim();
    const match = products.find(
      (p) => p.type.trim() === decoded || p.name.trim() === decoded
    );
    currentFilter = match ? match.type : "all";
  }

  loadProducts()
    .then((products) => {
      allProducts = products;
      renderFilterBar(products);
      applyFilterFromUrl(products);
      setActiveButton(currentFilter);
      renderProductList(allProducts, currentFilter);
    })
    .catch((err) => {
      console.error(err);
      productList.innerHTML = `<p style="grid-column:1/-1;text-align:center;">เกิดข้อผิดพลาดในการโหลดสินค้า</p>`;
    });
}

/* =========================================================
   2) ORDER.HTML — เติมฟอร์มอัตโนมัติ + ส่งข้อมูล
   ========================================================= */
function initOrderPage() {
  const form = document.querySelector("#orderForm");
  if (!form) return; // ไม่ใช่หน้านี้ ข้ามไป

  const customerNameInput = document.querySelector("#customerName");
  const contactInput = document.querySelector("#contact");
  const itemsInput = document.querySelector("#items");
  const totalInput = document.querySelector("#total");
  const noteInput = document.querySelector("#note");

  // 1) เติมค่า item / price จาก URL parameter ทันทีที่โหลดหน้า
  const params = new URLSearchParams(window.location.search);
  const itemParam = params.get("item");
  const priceParam = params.get("price");

  if (itemsInput && itemParam) {
    itemsInput.value = decodeURIComponent(itemParam);
  }
  if (totalInput && priceParam) {
    // สำคัญ: ต้องเติมช่อง total เสมอ ห้ามปล่อยว่าง
    totalInput.value = decodeURIComponent(priceParam);
  }

  // 2) ส่งข้อมูลไป Apps Script เมื่อกด "ยืนยันสั่งซื้อ"
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const payload = {
      customerName: customerNameInput ? customerNameInput.value : "",
      contact: contactInput ? contactInput.value : "",
      list: itemsInput ? itemsInput.value : "",
      total: totalInput ? totalInput.value : "",
      note: noteInput ? noteInput.value : "",
    };

    fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    })
      .then(() => {
        window.location.href = "thankyou.html";
      })
      .catch((error) => {
        console.error(error);
        alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      });
  });
}

/* =========================================================
   3) ADMIN.HTML — ดึง CSV จาก Google Sheet มาแสดงเป็นตาราง
   ========================================================= */

/* CSV parser (รองรับ field ที่ครอบด้วย " และมี , หรือขึ้นบรรทัดใหม่อยู่ข้างใน) */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        i++; // ข้าม " ตัวที่สอง
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\r") {
        // ข้าม \r เฉย ๆ รอ \n
      } else if (char === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }
  }

  // field/row สุดท้ายที่เหลือ (กรณีไฟล์ไม่จบด้วยการขึ้นบรรทัดใหม่)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // ตัดแถวว่าง ๆ ทิ้ง
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function initAdminPage() {
  const tbody = document.querySelector("#ordersTable tbody");
  if (!tbody) return; // ไม่ใช่หน้านี้ ข้ามไป

  fetch(SHEET_CSV_URL)
    .then((res) => {
      if (!res.ok) throw new Error("โหลดข้อมูลจาก Google Sheet ไม่สำเร็จ");
      return res.text();
    })
    .then((csvText) => {
      const rows = parseCSV(csvText);
      if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">ยังไม่มีข้อมูล</td></tr>`;
        return;
      }

      // แถวแรกคือ header: วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ
      const dataRows = rows.slice(1);

      // เรียงจากล่าสุดขึ้นก่อน โดยพยายาม parse วันที่จากคอลัมน์แรก
      const sortedRows = dataRows.slice().sort((a, b) => {
        const dateA = new Date(a[0]);
        const dateB = new Date(b[0]);
        const validA = !Number.isNaN(dateA.getTime());
        const validB = !Number.isNaN(dateB.getTime());

        if (validA && validB) return dateB - dateA;
        return 0; // parse วันที่ไม่ได้ ให้คงลำดับเดิมไว้ก่อน
      });

      // ถ้า parse วันที่ไม่ได้เลย ให้ fallback เป็นการกลับลำดับแถว (ล่าสุดอยู่ล่างสุดในชีท)
      const anyValidDate = dataRows.some((r) => !Number.isNaN(new Date(r[0]).getTime()));
      const finalRows = anyValidDate ? sortedRows : dataRows.slice().reverse();

      tbody.innerHTML = "";
      finalRows.forEach((cols) => {
        const [datetime = "", customerName = "", contact = "", list = "", total = "", note = ""] = cols;
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(datetime)}</td>
          <td>${escapeHtml(customerName)}</td>
          <td>${escapeHtml(contact)}</td>
          <td>${escapeHtml(list)}</td>
          <td>${escapeHtml(total)}</td>
          <td>${escapeHtml(note)}</td>
        `;
        tbody.appendChild(tr);
      });
    })
    .catch((err) => {
      console.error(err);
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
    });
}

/* =========================================================
   Bootstrap — รันเฉพาะฟังก์ชันที่ตรงกับ element ในหน้านั้น ๆ
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  initProductPage();
  initOrderPage();
  initAdminPage();
});
