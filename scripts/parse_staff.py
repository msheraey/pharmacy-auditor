#!/usr/bin/env python3
"""Parse payroll CSV and generate staff seed SQL for the app."""

import csv
import re
import sys

# Branch name mapping: Workplace value → seed branch name
BRANCH_MAP = {
    "palm": "Palm",
    "capital": "Capital",
    "citywalk": "City Walk",
    "city walk": "City Walk",
    "park": "Park",
    "park retail": "Park",
    "circle": "Circle",
    "dhcc": "DHCC",
    "al quoz": "Al Quoz",
    "al zahia": "Zahia",
    "zahia": "Zahia",
    "al ain": "Al Ain",
    "corniche": "Corniche",
    "nad al shiba": "Nad Al Shiba",
    "dcc": "DCC",
    "old town": "Old Town",
    "south": "South",
    "gm 1": "GM 1",
    "gm 2": "GM 2",
    "gm 2 retail": "GM 2",
    "promenade": "Promenade",
    "studio city": "Studio City",
    "800 arjan": "Arjan",
    "arjan": "Arjan",
    "800 mirdif": "Mirdif",
    "mirdif": "Mirdif",
    "center": "Center",
    "business bay": "Business Bay",
    "one central": "One Central",
    "gate avenue": "Gate Avenue",
    "gate avenue ": "Gate Avenue",
    "atlantis": "Atlantis 1",
    "atlantis 2": "Atlantis 2",
    "star": "Star",
    "jumeirah": "Jumeirah",
    "sharjah": "Sharjah",
    "800-rak": "RAK",
    "rak": "RAK",
    "madinat al riyad": "Madinat Al Riyad",
    "madinat al riyadh": "Madinat Al Riyad",
    "shamkha": "Shamkha",
    "shamkah": "Shamkha",
    "shmkha": "Shamkha",
    "greens": "Greens",
    "promnade": "Promenade",
    "old town ": "Old Town",
    "one central ": "One Central",
    # Mediclinic hospital pharmacies → same branch
    "mediclinic 800 arjan": "Arjan",
    "mediclinic dhcc": "DHCC",
    "mediclinic park": "Park",
    "mediclinic corniche": "Corniche",
    "mediclinic al ain": "Al Ain",
    "mediclinic capital": "Capital",
    "mediclinic al quoz": "Al Quoz",
}

def norm(w):
    return w.strip().lower()

def map_branch(workplace):
    if not workplace:
        return None
    n = norm(workplace)
    if n in BRANCH_MAP:
        return BRANCH_MAP[n]
    return None

def map_role(designation):
    d = designation.strip().upper()
    if "PHARMACIST" in d:
        return "Pharmacist"
    if "BRANCH MANAGER" in d or "800 BRANCH MANAGER" in d:
        return "Branch Manager"
    if d in ("SALESMAN", "SALES ASSOCIATE", "SALESWOMAN", "SALES"):
        return "Salesperson"
    if d in ("ASSISTANT", "CALL CENTER AGENT", "800 CALL CENTER AGENT"):
        return "Salesperson"
    return None

# Read CSV
rows = []
with open(sys.argv[1], newline="", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    for r in reader:
        rows.append(r)

print("-- Staff seed generated from payroll CSV")
print("-- Run this AFTER branches are seeded (the branches seed is idempotent)")
print()

inserts = []
staff_code_map = {}  # dedup by EMP ID
branches_used = set()  # track which branches we reference

for r in rows:
    emp_id = r["EMP ID"].strip()
    name = r["Employee Name"].strip()
    designation = r["Designation"].strip()
    allocation = r["Allocation"].strip() if r.get("Allocation") else ""
    workplace = r["Workplace"].strip() if r.get("Workplace") else ""

    role = map_role(designation)
    if not role:
        continue  # skip non-pharmacy roles

    # Skip non-pharmacy allocations (but keep Hospital — those are Mediclinic pharmacies)
    if allocation in ("Head Office", "Courier", "Bambah and House Maids", "BAMBAH STUDIO"):
        continue

    branch = map_branch(workplace)
    if not branch:
        continue  # skip if no matching branch

    staff_code = f"EMP{emp_id}"
    if staff_code in staff_code_map:
        continue  # dedup
    staff_code_map[staff_code] = True

    branches_used.add(branch)
    name_esc = name.replace("'", "''")
    dha = "'Active'" if role == "Pharmacist" else "NULL"
    var = branch.replace(" ", "_").replace("-", "_").lower()
    inserts.append(
        f"  ('{staff_code}', '{name_esc}', '{role}', (SELECT id FROM {var}), {dha}, true)"
    )

if inserts:
    print("-- Generated: " + sys.argv[1])
    print()
    print("DO $$ BEGIN")
    print("  IF EXISTS (SELECT 1 FROM public.staff WHERE staff_code LIKE 'EMP%' LIMIT 1) THEN RETURN; END IF;")
    print("END $$;")
    print()
    print("WITH")
    ctes = []
    for b in sorted(branches_used):
        var = b.replace(" ", "_").replace("-", "_").lower()
        ctes.append(f"  {var} AS (SELECT id FROM public.branches WHERE name = '{b}' LIMIT 1)")
    print(",\n".join(ctes))
    print("INSERT INTO public.staff (staff_code, full_name, role, branch_id, dha_license_status, active)")
    print("SELECT * FROM (VALUES")
    for i, ins in enumerate(inserts):
        sep = "," if i < len(inserts) - 1 else ""
        print(ins + sep)
    print(") AS t(staff_code, full_name, role, branch_id, dha_license_status, active)")
    print("ON CONFLICT (staff_code) DO NOTHING;")
    print(f"\n-- Total: {len(inserts)} staff")
else:
    print("-- No staff matched")
