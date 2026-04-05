"""Generate sample CSV and JSON datasets for development and testing."""
import json
import random
from datetime import date, timedelta
from pathlib import Path

import numpy as np

random.seed(42)
np.random.seed(42)

OUTPUT = Path(__file__).parent.parent / "data" / "sample_data"
OUTPUT.mkdir(parents=True, exist_ok=True)

# ── helpers ──────────────────────────────────────────────────────────────────

def rand_date(start: date, end: date) -> str:
    delta = (end - start).days
    return (start + timedelta(days=random.randint(0, delta))).isoformat()


REGIONS = ["North", "South", "East", "West", "Central"]
CATEGORIES = ["Electronics", "Clothing", "Home & Garden", "Sports", "Books", "Food"]
DEPARTMENTS = ["Engineering", "Sales", "Marketing", "HR", "Finance", "Operations"]
ROLES = ["Junior", "Mid", "Senior", "Lead", "Manager"]

# ── sales ────────────────────────────────────────────────────────────────────

sales_rows = []
for i in range(1, 1001):
    qty = random.randint(1, 20)
    price = round(random.uniform(5, 500), 2)
    sales_rows.append({
        "order_id": i,
        "customer_id": random.randint(1, 200),
        "product_id": random.randint(1, 50),
        "order_date": rand_date(date(2023, 1, 1), date(2024, 12, 31)),
        "quantity": qty,
        "unit_price": price,
        "total_amount": round(qty * price, 2),
        "region": random.choice(REGIONS),
        "category": random.choice(CATEGORIES),
    })

# Write CSV
import csv
with open(OUTPUT / "sales.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=sales_rows[0].keys())
    writer.writeheader()
    writer.writerows(sales_rows)

# Write JSON (for /api/sample-data/sales)
with open(OUTPUT / "sales.json", "w") as f:
    json.dump({"records": sales_rows, "meta": {"row_count": len(sales_rows)}}, f, indent=2)

# ── employees ────────────────────────────────────────────────────────────────

emp_rows = []
first_names = ["Alice", "Bob", "Carol", "David", "Eva", "Frank", "Grace", "Hiro", "Isla", "Jake"]
last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis"]
for i in range(1, 201):
    base_salary = {"Engineering": 95000, "Sales": 70000, "Marketing": 72000,
                   "HR": 65000, "Finance": 85000, "Operations": 68000}
    dept = random.choice(DEPARTMENTS)
    years = random.randint(0, 20)
    emp_rows.append({
        "employee_id": i,
        "name": f"{random.choice(first_names)} {random.choice(last_names)}",
        "department": dept,
        "role": random.choice(ROLES),
        "salary": round(base_salary[dept] + years * 2000 + np.random.normal(0, 5000), 2),
        "hire_date": rand_date(date(2000, 1, 1), date(2024, 1, 1)),
        "performance_score": round(random.uniform(2.0, 5.0), 1),
        "years_experience": years,
    })

with open(OUTPUT / "employees.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=emp_rows[0].keys())
    writer.writeheader()
    writer.writerows(emp_rows)

with open(OUTPUT / "employees.json", "w") as f:
    json.dump({"records": emp_rows, "meta": {"row_count": len(emp_rows)}}, f, indent=2)

# ── products ─────────────────────────────────────────────────────────────────

SUB_CATS = {
    "Electronics": ["Phones", "Laptops", "Accessories"],
    "Clothing": ["Men", "Women", "Kids"],
    "Home & Garden": ["Furniture", "Tools", "Decor"],
    "Sports": ["Outdoor", "Fitness", "Team Sports"],
    "Books": ["Fiction", "Non-Fiction", "Academic"],
    "Food": ["Snacks", "Beverages", "Organic"],
}

prod_rows = []
for i in range(1, 51):
    cat = random.choice(CATEGORIES)
    cost = round(random.uniform(2, 200), 2)
    prod_rows.append({
        "product_id": i,
        "name": f"Product-{i:03d}",
        "category": cat,
        "sub_category": random.choice(SUB_CATS[cat]),
        "cost": cost,
        "price": round(cost * random.uniform(1.2, 3.0), 2),
        "stock_units": random.randint(0, 500),
        "rating": round(random.uniform(1.0, 5.0), 1),
    })

with open(OUTPUT / "products.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=prod_rows[0].keys())
    writer.writeheader()
    writer.writerows(prod_rows)

with open(OUTPUT / "products.json", "w") as f:
    json.dump({"records": prod_rows, "meta": {"row_count": len(prod_rows)}}, f, indent=2)

# ── payments ─────────────────────────────────────────────────────────────────

METHODS = ["Credit Card", "Debit Card", "PayPal", "Bank Transfer", "Crypto"]
METHOD_WEIGHTS = [0.42, 0.24, 0.18, 0.11, 0.05]   # realistic distribution

# Status probabilities per method
METHOD_STATUS = {
    "Credit Card":    {"completed": 0.92, "pending": 0.03, "failed": 0.03, "refunded": 0.02},
    "Debit Card":     {"completed": 0.90, "pending": 0.04, "failed": 0.04, "refunded": 0.02},
    "PayPal":         {"completed": 0.94, "pending": 0.02, "failed": 0.02, "refunded": 0.02},
    "Bank Transfer":  {"completed": 0.85, "pending": 0.10, "failed": 0.03, "refunded": 0.02},
    "Crypto":         {"completed": 0.80, "pending": 0.08, "failed": 0.08, "refunded": 0.04},
}

PROCESSOR_FEE_RATE = {
    "Credit Card": 0.029, "Debit Card": 0.015, "PayPal": 0.034,
    "Bank Transfer": 0.005, "Crypto": 0.010,
}

payment_rows = []
for i, sale in enumerate(sales_rows):
    method = random.choices(METHODS, weights=METHOD_WEIGHTS)[0]
    dist = METHOD_STATUS[method]
    status = random.choices(list(dist.keys()), weights=list(dist.values()))[0]

    # Payment date is 0-3 days after order date
    o_date = date.fromisoformat(sale["order_date"])
    p_date = o_date + timedelta(days=random.randint(0, 3))

    amount = sale["total_amount"]
    fee_rate = PROCESSOR_FEE_RATE[method]
    fee = round(amount * fee_rate + random.uniform(0.10, 0.50), 2)
    net = round(amount - fee, 2) if status == "completed" else 0.0

    payment_rows.append({
        "payment_id": i + 1,
        "order_id": sale["order_id"],
        "customer_id": sale["customer_id"],
        "payment_date": p_date.isoformat(),
        "payment_method": method,
        "amount": amount,
        "status": status,
        "processor_fee": fee,
        "net_amount": net,
        "currency": "USD",
        "region": sale["region"],
        "category": sale["category"],
    })

with open(OUTPUT / "payments.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=payment_rows[0].keys())
    writer.writeheader()
    writer.writerows(payment_rows)

with open(OUTPUT / "payments.json", "w") as f:
    json.dump({"records": payment_rows, "meta": {"row_count": len(payment_rows)}}, f, indent=2)

print(f"Generated: sales ({len(sales_rows)} rows), employees ({len(emp_rows)} rows), "
      f"products ({len(prod_rows)} rows), payments ({len(payment_rows)} rows)")
print(f"Output directory: {OUTPUT}")
