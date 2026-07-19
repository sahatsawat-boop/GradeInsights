# ระบบดูคะแนนและบันทึกผลการเรียน - GradeInsights V5

ระบบดูคะแนนนักเรียนออนไลน์ เชื่อมต่อตรงกับฐานข้อมูล Google Sheets ผ่าน Google Apps Script Web App พัฒนาขึ้นสำหรับปีการศึกษา 2569 (โรงเรียนธัญบุรี)

---

## 📁 โครงสร้างโฟลเดอร์สำหรับพัฒนา

ระบบนี้ได้รับการออกแบบโครงสร้างเป็นแบบแยกส่วนเพื่อการพัฒนาที่สะดวกยิ่งขึ้น:

- `src/` — โฟลเดอร์ต้นฉบับโค้ด (กรุณาแก้ไขโค้ดของคุณครูในโฟลเดอร์นี้)
  - `src/index.html` — โครงสร้างหน้าเว็บหลัก HTML
  - `src/styles.css` — ไฟล์ตกแต่งและสไตล์ CSS
  - `src/app.js` — ตรรกะฝั่งหน้าบ้าน JavaScript (การคำนวณและแสดงผล UI)
  - `src/Code.gs` — สคริปต์หลังบ้าน Google Apps Script (backend)
- `compile.ps1` — สคริปต์รวมโค้ด (คอมไพล์) เพื่อแพ็กรวมโค้ดหน้าบ้านไว้ใน `index.html` ของโฟลเดอร์หลัก และคัดลอก `Code.gs` ไปยัง `รหัส.js` สำหรับใช้งานบนเว็บแอปจริง

---

## 🛠️ วิธีการทำงานและพัฒนา

### 1. แก้ไขโค้ดระบบ
ทำการแก้ไขระบบผ่านไฟล์ในโฟลเดอร์ `src/` ตามต้องการ

### 2. รวบรวมโค้ด (Compile)
เมื่อทำการแก้ไขโค้ดใน `src/` แล้ว จำเป็นต้องรวมโค้ดกลับไปที่ไฟล์ภายนอกก่อน Deploy โดยเปิด PowerShell แล้วรันสคริปต์:
```powershell
powershell -ExecutionPolicy Bypass -File .\compile.ps1
```

### 3. Deploy ขึ้น Google Apps Script (ผ่าน Clasp)
หลังจากรันคอมไพล์สำเร็จแล้ว สามารถอัปเดตไฟล์ขึ้น Google Sheets (Apps Script) ได้ง่ายๆ ด้วยคำสั่ง clasp:
```powershell
powershell -ExecutionPolicy Bypass -Command "clasp push"
```

---

## 🔗 วิธีการเชื่อมต่อกับ GitHub

หากยังไม่มีการเชื่อมต่อกับ GitHub คุณครูสามารถดำเนินการได้โดย:
1. สร้างคลังเก็บโค้ดใหม่ (New Repository) บน GitHub
2. คัดลอกลิงก์ `.git` ของคลังนั้น
3. เปิด Terminal/PowerShell แล้วรันคำสั่ง:
   ```bash
   git remote add origin <ลิงก์ของคลังเก็บโค้ด GitHub>
   git branch -M main
   git push -u origin main
   ```
