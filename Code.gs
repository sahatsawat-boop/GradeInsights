/**
 * GradeInsights - Google Apps Script Server Side Code (Code.gs)
 * พัฒนาสำหรับติดตั้งโดยตรงในส่วนขยาย Apps Script ของ Google Sheets
 */

// โหมดเริ่มต้น: แสดงหน้าเว็บแอปพลิเคชัน (HTML) เมื่อเปิดผ่านลิงก์ Web App
// ฟังก์ชันควบคุมสิทธิ์และการแสดงผลหน้าเว็บ หรือรับส่งข้อมูลผ่าน API
function doGet(e) {
  // ตรวจจับกรณีเป็นการเรียกใช้งานข้ามเซิร์ฟเวอร์ (API GET Request)
  if (e.parameter.action) {
    var action = e.parameter.action;
    var result;
    try {
      if (action === "getInitData") {
        result = getInitData();
      } else if (action === "fetchAllGrades") {
        if (e.parameter.pin !== getTeacherPIN()) {
          result = { status: "error", message: "สิทธิ์การเข้าถึงข้อมูลไม่ถูกต้อง" };
        } else {
          result = fetchAllGradesAcrossSheetsAPI();
        }
      } else if (action === "searchStudent") {
        result = searchStudentAcrossSheetsAPI(e.parameter.studentId, e.parameter.classroom);
      } else if (action === "fetchGradesData") {
        if (e.parameter.pin !== getTeacherPIN()) {
          result = { status: "error", message: "สิทธิ์การเข้าถึงข้อมูลไม่ถูกต้อง" };
        } else {
          result = fetchGradesData(e.parameter.sheetName);
        }
      } else if (action === "verifyTeacherPIN") {
        var clientPin = e.parameter.pin || "";
        if (clientPin === getTeacherPIN()) {
          result = { status: "success", message: "ยืนยันรหัสผ่านถูกต้อง" };
        } else {
          result = { status: "error", message: "รหัส PIN ไม่ถูกต้อง" };
        }
      } else {
        result = { status: "error", message: "ไม่พบ Action GET ที่ต้องการ" };
      }
    } catch(err) {
      result = { status: "error", message: err.message };
    }
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // โหมดแสดงหน้าเว็บแอปปกติเมื่อรันในระบบ Google
  try {
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('GradeInsights - ระบบดูคะแนนและบันทึกผลการเรียน')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (err) {
    return HtmlService.createHtmlOutput(
      "<div style='font-family: sans-serif; padding: 20px; text-align: center; color: #d9534f;'>" +
      "<h3>เกิดข้อผิดพลาดในการโหลดหน้าเว็บ</h3>" +
      "<p>กรุณาตรวจสอบว่าได้สร้างไฟล์ HTML ชื่อ <b>index</b> และใส่โค้ดฝั่งหน้าเว็บเรียบร้อยแล้ว</p>" +
      "<p><i>รายละเอียดข้อผิดพลาด: " + err.message + "</i></p>" +
      "</div>"
    );
  }
}

// ฟังก์ชันควบคุมการส่งข้อมูลเข้ามาอัปเดตข้ามเซิร์ฟเวอร์ (API POST Request)
function doPost(e) {
  var params;
  try {
    params = JSON.parse(e.postData.contents);
  } catch(err) {
    // ในกรณีส่งข้อมูลผ่าน no-cors หรือฟอร์มธรรมดา
    params = e.parameter;
  }
  
  var action = params.action;
  var result;
  
  try {
    // ตรวจสอบสิทธิ์เข้าถึง (PIN) สำหรับการยิงแก้ไขข้อมูลทุกช่องทาง
    if (action !== "verifyTeacherPIN") {
      var clientPin = params.pin || "";
      if (clientPin !== getTeacherPIN()) {
        result = { status: "error", message: "สิทธิ์การเข้าถึงข้อมูลไม่ถูกต้อง (รหัสผ่านผิดพลาด)" };
        return ContentService.createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === "verifyTeacherPIN") {
      var clientPin = params.pin || "";
      if (clientPin === getTeacherPIN()) {
        result = { status: "success", message: "ยืนยันรหัสผ่านถูกต้อง" };
      } else {
        result = { status: "error", message: "รหัส PIN ไม่ถูกต้อง" };
      }
    } else if (action === "updateScores") {
      // แปลงข้อมูลคะแนนเก็บเป็นรูปแบบ Object
      var scoresObj = typeof params.scores === "string" ? JSON.parse(params.scores) : params.scores;
      result = updateScoresAPI(params.sheetName, params.studentId, params.subjectCode, scoresObj);
    } else if (action === "addColumn") {
      result = addColumnAPI(params.sheetName, params.columnName);
    } else if (action === "deleteColumn") {
      result = deleteColumnAPI(params.sheetName, params.columnName);
    } else if (action === "renameColumn") {
      result = renameColumnAPI(params.sheetName, params.oldColumnName, params.newColumnName);
    } else if (action === "deleteStudent") {
      result = deleteStudentAPI(params.sheetName, params.studentId, params.subjectCode);
    } else if (action === "addStudent") {
      var studentDataObj = typeof params.studentData === "string" ? JSON.parse(params.studentData) : params.studentData;
      result = addStudentAPI(params.sheetName, studentDataObj);
    } else if (action === "addStudentsBulk") {
      var studentsListObj = typeof params.studentsList === "string" ? JSON.parse(params.studentsList) : params.studentsList;
      result = addStudentsBulkAPI(studentsListObj);
    } else if (action === "saveCustomSubjectName") {
      result = saveCustomSubjectNameAPI(params.sheetName, params.customName);
    } else if (action === "saveSummaryReport") {
      var reportData = typeof params.reportData === "string" ? JSON.parse(params.reportData) : params.reportData;
      result = saveSummaryReportAPI(reportData);
    } else if (action === "createSampleData") {
      result = createSampleDataAPI();
    } else {
      result = { status: "error", message: "ไม่พบ Action POST ที่ต้องการ" };
    }
  } catch(err) {
    result = { status: "error", message: err.message };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// -------------------------------------------------------------
// CORE UTILITIES & CONFIG FUNCTIONS
// -------------------------------------------------------------

/**
 * ดึงค่ารหัส PIN ของครูจากสเปรดชีต (ชีท Config)
 * หากไม่พบแผ่นงานหรือค่าดังกล่าว จะใช้ค่าเริ่มต้น "1234"
 */
function getTeacherPIN() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var configSheet = ss.getSheetByName("Config") || ss.getSheetByName("Settings");
    if (!configSheet) return "1234";
    
    var data = configSheet.getDataRange().getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] && String(data[i][0]).trim().toLowerCase() === "teacherpin") {
        return String(data[i][1]).trim();
      }
    }
  } catch (e) {
    // ป้องกันข้อผิดพลาด ย้อนกลับไปใช้รหัสเริ่มต้น
  }
  return "1234";
}

/**
 * ดึงข้อมูลเริ่มต้นของแอปพลิเคชัน (ดึงชื่อแผ่นงานทั้งหมด, รายชื่อห้องเรียนทั้งหมด, และรหัส PIN)
 */
function getInitData() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    var sheetNames = [];
    var classroomsSet = {};
    
    for (var i = 0; i < sheets.length; i++) {
      var sheet = sheets[i];
      var name = sheet.getName();
      
      // ข้ามชีทตั้งค่า และชีทรายงานสรุป
      if (name === "Config" || name === "Settings" || name === "สรุปผลสัมฤทธิ์") continue;
      sheetNames.push(name);
      
      // สแกนหาห้องเรียนในชีทนี้
      var data = sheet.getDataRange().getValues();
      if (data.length <= 1) continue;
      
      var headers = data[0];
      var classroomColIndex = headers.indexOf("classroom");
      if (classroomColIndex !== -1) {
        for (var r = 1; r < data.length; r++) {
          var val = data[r][classroomColIndex];
          if (val !== "" && val !== null && val !== undefined) {
            classroomsSet[String(val).trim()] = true;
          }
        }
      }
    }
    
    var classrooms = Object.keys(classroomsSet).sort();
    
    return {
      status: "success",
      sheetNames: sheetNames,
      classrooms: classrooms
    };
  } catch (err) {
    return {
      status: "error",
      message: "ไม่สามารถเชื่อมต่อสเปรดชีตได้: " + err.message
    };
  }
}

/**
 * ดึงข้อมูลผลสอบและคะแนนทั้งหมดจากทุก ๆ แผ่นงานของอาจารย์มารวมกันในครั้งเดียว
 */
function fetchAllGradesAcrossSheetsAPI() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    var allGrades = [];
    var sheetNames = [];
    var classroomsSet = {};
    var sheetHeadersMap = {};
    var allHeadersSet = {};
    
    for (var i = 0; i < sheets.length; i++) {
      var sheet = sheets[i];
      var name = sheet.getName();
      
      if (name === "Config" || name === "Settings" || name === "สรุปผลสัมฤทธิ์") continue;
      sheetNames.push(name);
      
      var data = sheet.getDataRange().getValues();
      if (data.length <= 1) continue;
      
      var headers = data[0];
      sheetHeadersMap[name] = headers;
      headers.forEach(function(h) {
        allHeadersSet[h] = true;
      });
      
      var studentIdCol = headers.indexOf("student_id");
      var classroomCol = headers.indexOf("classroom");
      
      for (var r = 1; r < data.length; r++) {
        var row = data[r];
        var rowObj = {};
        for (var c = 0; c < headers.length; c++) {
          rowObj[headers[c]] = row[c];
        }
        
        // แนบชื่อชีทต้นทางเพื่อใช้อ้างอิงการเซฟ
        rowObj["_sheetName"] = name;
        allGrades.push(rowObj);
        
        if (classroomCol !== -1 && row[classroomCol]) {
          classroomsSet[String(row[classroomCol]).trim()] = true;
        }
      }
    }
    
    return {
      status: "success",
      data: allGrades,
      sheetNames: sheetNames,
      classrooms: Object.keys(classroomsSet).sort(),
      sheetHeadersMap: sheetHeadersMap,
      allHeaders: Object.keys(allHeadersSet),
      customSubjectNames: getCustomSubjectNames()
    };
  } catch (err) {
    return {
      status: "error",
      message: "ไม่สามารถโหลดข้อมูลทั้งหมดได้: " + err.message
    };
  }
}


// -------------------------------------------------------------
// STUDENT API FUNCTIONS (การใช้งานฝั่งนักเรียน)
// -------------------------------------------------------------

/**
 * ค้นหาผลการเรียนของนักเรียนจาก "รหัสประจำตัว" และ "ห้องเรียน" ข้ามทุกแผ่นงาน
 */
function searchStudentAcrossSheetsAPI(studentId, classroom) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    var results = [];
    
    for (var i = 0; i < sheets.length; i++) {
      var sheet = sheets[i];
      var sheetName = sheet.getName();
      
      // ข้ามชีทตั้งค่า และชีทรายงานสรุป
      if (sheetName === "Config" || sheetName === "Settings" || sheetName === "สรุปผลสัมฤทธิ์") continue;
      
      var data = sheet.getDataRange().getValues();
      if (data.length <= 1) continue; // ชีทว่างหรือมีแต่หัวข้อ
      
      var headers = data[0];
      var studentIdCol = headers.indexOf("student_id");
      var classroomCol = headers.indexOf("classroom");
      
      if (studentIdCol === -1 || classroomCol === -1) continue;
      
      for (var r = 1; r < data.length; r++) {
        var row = data[r];
        if (String(row[studentIdCol]).trim() === String(studentId).trim() && 
            String(row[classroomCol]).trim() === String(classroom).trim()) {
          
          var rowObj = {};
          for (var c = 0; c < headers.length; c++) {
            rowObj[headers[c]] = row[c];
          }
          
          results.push({
            sheetName: sheetName,
            headers: headers,
            data: rowObj
          });
        }
      }
    }
    
    return {
      status: "success",
      results: results
    };
  } catch (err) {
    return {
      status: "error",
      message: "เกิดข้อผิดพลาดในการค้นหาข้อมูล: " + err.message
    };
  }
}

// -------------------------------------------------------------
// TEACHER API FUNCTIONS (การใช้งานฝั่งคุณครู)
// -------------------------------------------------------------

/**
 * ดึงข้อมูลผลสอบและคะแนนทั้งหมดจากแผ่นงานที่เลือก
 */
function fetchGradesData(sheetName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      return {
        status: "error",
        message: "ไม่พบแผ่นงานย่อยชื่อ \"" + sheetName + "\" ใน Google Sheets"
      };
    }
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var rows = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j];
      }
      rows.push(row);
    }
    
    var sheetNames = ss.getSheets()
      .map(function(s) { return s.getName(); })
      .filter(function(name) { return name !== "Config" && name !== "Settings" && name !== "สรุปผลสัมฤทธิ์"; });
    
    return {
      status: "success",
      headers: headers,
      data: rows,
      sheetNames: sheetNames
    };
  } catch (err) {
    return {
      status: "error",
      message: "ไม่สามารถดึงข้อมูลแผ่นงานได้: " + err.message
    };
  }
}

/**
 * แก้ไขคะแนนเก็บหรือคะแนนสอบนักเรียนรายคน
 */
function updateScoresAPI(sheetName, studentId, subjectCode, scores) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return {status: "error", message: "ไม่พบแผ่นงานย่อยชื่อ \"" + sheetName + "\""};
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    
    var targetRowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(studentId) && String(data[i][4]) === String(subjectCode)) {
        targetRowIndex = i + 1; // อิงเลขบรรทัดจริง (1-based index)
        break;
      }
    }
    
    if (targetRowIndex !== -1) {
      for (var key in scores) {
        var colIndex = headers.indexOf(key);
        if (colIndex !== -1) {
          sheet.getRange(targetRowIndex, colIndex + 1).setValue(scores[key]);
        }
      }
      return {status: "success"};
    } else {
      return {status: "error", message: "ไม่พบข้อมูลนักเรียนและรายวิชาดังกล่าวในแผ่นงานนี้"};
    }
  } catch (err) {
    return {status: "error", message: "เกิดข้อผิดพลาดในการบันทึกคะแนน: " + err.message};
  }
}

/**
 * เพิ่มคอลัมน์คะแนนเก็บใหม่ในชีทที่กำหนด
 */
function addColumnAPI(sheetName, columnName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return {status: "error", message: "ไม่พบแผ่นงานย่อยชื่อ \"" + sheetName + "\""};
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    
    // ค้นหาคอลัมน์ comment เพื่อนำคอลัมน์ใหม่ไปแทรกก่อนความคิดเห็น
    var commentIndex = headers.indexOf("comment");
    if (commentIndex === -1) commentIndex = headers.length;
    
    sheet.insertColumnBefore(commentIndex + 1);
    sheet.getRange(1, commentIndex + 1).setValue(columnName);
    
    return {status: "success"};
  } catch (err) {
    return {status: "error", message: "เกิดข้อผิดพลาดในการเพิ่มคอลัมน์: " + err.message};
  }
}

/**
 * ลบคอลัมน์คะแนนเก็บในชีทที่กำหนด
 */
function deleteColumnAPI(sheetName, columnName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return {status: "error", message: "ไม่พบแผ่นงานย่อยชื่อ \"" + sheetName + "\""};
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    
    var colIndex = headers.indexOf(columnName);
    if (colIndex !== -1) {
      sheet.deleteColumn(colIndex + 1);
      return {status: "success"};
    } else {
      return {status: "error", message: "ไม่พบหัวข้อคะแนนดังกล่าวในชีท"};
    }
  } catch (err) {
    return {status: "error", message: "เกิดข้อผิดพลาดในการลบคอลัมน์: " + err.message};
  }
}


/**
 * เพิ่มข้อมูลนักเรียนรายใหม่ลงในชีทที่กำหนด
 */
function addStudentAPI(sheetName, studentData) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return {status: "error", message: "ไม่พบแผ่นงานย่อยชื่อ \"" + sheetName + "\""};
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    
    var newRow = [];
    for (var i = 0; i < headers.length; i++) {
      var header = headers[i];
      if (header === "student_id") newRow.push(studentData.student_id);
      else if (header === "name") newRow.push(studentData.name);
      else if (header === "classroom") newRow.push(studentData.classroom);
      else if (header === "student_no") newRow.push(Number(studentData.student_no) || 0);
      else if (header === "subject_code") newRow.push(studentData.subject_code);
      else if (header === "subject_name") newRow.push(studentData.subject_name);
      else if (header === "midterm_score") newRow.push(studentData.midterm_score !== "" ? Number(studentData.midterm_score) : "");
      else if (header === "final_score") newRow.push(studentData.final_score !== "" ? Number(studentData.final_score) : "");
      else if (header === "comment") newRow.push(studentData.comment || "");
      else {
        // สำหรับคอลัมน์คะแนนเก็บย่อย
        newRow.push(studentData.scores && studentData.scores[header] !== undefined ? Number(studentData.scores[header]) : "");
      }
    }
    
    sheet.appendRow(newRow);
    return {status: "success"};
  } catch (err) {
    return {status: "error", message: "เกิดข้อผิดพลาดในการเพิ่มนักเรียน: " + err.message};
  }
}

/**
 * นำเข้าข้อมูลนักเรียนหลายรายพร้อมกัน
 * โดยระบบจะแยกแผ่นงานปลายทางอัตโนมัติ สร้างชีทใหม่หากไม่มีอยู่จริง 
 * และหากพบรหัสนักเรียนซ้ำจะทำการอัปเดตข้อมูลส่วนตัวแต่คงคะแนนเดิมไว้
 */
function addStudentsBulkAPI(studentsList) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // จัดกลุ่มนักเรียนตามแผ่นงานปลายทาง
    var grouped = {};
    for (var i = 0; i < studentsList.length; i++) {
      var student = studentsList[i];
      var room = String(student.classroom).trim();
      var subject = String(student.subject_name).trim();
      if (!room || !subject) continue;
      
      var sheetName = room + "_" + subject;
      if (!grouped[sheetName]) grouped[sheetName] = [];
      grouped[sheetName].push(student);
    }
    
    var processedCount = 0;
    var updatedCount = 0;
    var createdSheets = [];
    
    // วนลูปดำเนินการในแต่ละแผ่นงาน
    for (var sheetName in grouped) {
      var sheet = ss.getSheetByName(sheetName);
      var headers = [];
      
      // ถ้าไม่มีแผ่นงานนี้ ให้สร้างใหม่พร้อมหัวตารางเริ่มต้น
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        headers = ["student_id", "name", "classroom", "student_no", "subject_code", "subject_name", "midterm_score", "final_score", "comment"];
        sheet.appendRow(headers);
        createdSheets.push(sheetName);
      } else {
        headers = sheet.getDataRange().getValues()[0];
      }
      
      var dataRange = sheet.getDataRange();
      var dataValues = dataRange.getValues();
      var headerMap = {};
      for (var col = 0; col < headers.length; col++) {
        headerMap[headers[col]] = col;
      }
      
      var studentIdCol = headerMap["student_id"];
      var subjectCodeCol = headerMap["subject_code"];
      
      if (studentIdCol === undefined || subjectCodeCol === undefined) {
        return {status: "error", message: "แผ่นงานย่อย \"" + sheetName + "\" ไม่มีโครงสร้างคอลัมน์ที่ถูกต้อง"};
      }
      
      var sheetStudents = grouped[sheetName];
      
      for (var s = 0; s < sheetStudents.length; s++) {
        var newStudent = sheetStudents[s];
        var sId = String(newStudent.student_id).trim();
        var sSubj = String(newStudent.subject_code).trim();
        
        // ตรวจสอบว่ามีอยู่แล้วหรือไม่
        var existingRowIndex = -1;
        for (var r = 1; r < dataValues.length; r++) {
          if (String(dataValues[r][studentIdCol]).trim() === sId && 
              String(dataValues[r][subjectCodeCol]).trim() === sSubj) {
            existingRowIndex = r + 1; // อิงแถวจริง (1-based index)
            break;
          }
        }
        
        if (existingRowIndex !== -1) {
          // อัปเดตข้อมูลส่วนตัวแถวเดิม
          var range = sheet.getRange(existingRowIndex, 1, 1, headers.length);
          var rowValues = dataValues[existingRowIndex - 1];
          
          if (headerMap["name"] !== undefined) rowValues[headerMap["name"]] = newStudent.name;
          if (headerMap["classroom"] !== undefined) rowValues[headerMap["classroom"]] = newStudent.classroom;
          if (headerMap["student_no"] !== undefined) rowValues[headerMap["student_no"]] = Number(newStudent.student_no) || 0;
          if (headerMap["subject_code"] !== undefined) rowValues[headerMap["subject_code"]] = newStudent.subject_code;
          if (headerMap["subject_name"] !== undefined) rowValues[headerMap["subject_name"]] = newStudent.subject_name;
          
          range.setValues([rowValues]);
          dataValues[existingRowIndex - 1] = rowValues; // อัปเดตข้อมูลฝั่งโลคอลเพื่อใช้เช็คซ้ำ
          updatedCount++;
        } else {
          // เพิ่มรายชื่อแถวใหม่
          var newRow = [];
          for (var col = 0; col < headers.length; col++) {
            var h = headers[col];
            if (h === "student_id") newRow.push(newStudent.student_id);
            else if (h === "name") newRow.push(newStudent.name);
            else if (h === "classroom") newRow.push(newStudent.classroom);
            else if (h === "student_no") newRow.push(Number(newStudent.student_no) || 0);
            else if (h === "subject_code") newRow.push(newStudent.subject_code);
            else if (h === "subject_name") newRow.push(newStudent.subject_name);
            else if (h === "midterm_score") newRow.push("");
            else if (h === "final_score") newRow.push("");
            else if (h === "comment") newRow.push("");
            else newRow.push("");
          }
          sheet.appendRow(newRow);
          dataValues.push(newRow); // อัปเดตข้อมูลฝั่งโลคอล
          processedCount++;
        }
      }
    }
    
    return {
      status: "success", 
      added: processedCount,
      updated: updatedCount,
      createdSheets: createdSheets
    };
  } catch (err) {
    return {status: "error", message: err.message};
  }
}


// -------------------------------------------------------------
// SPREADSHEET SHORTCUT MENU (เมนูเสริมใน Google Sheets)
// -------------------------------------------------------------
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('GradeInsights')
      .addItem('🌐 เปิดหน้าต่างระบบดูคะแนน (Web App)', 'openWebAppDialog')
      .addItem('📊 สร้างข้อมูลตัวอย่าง (Create Sample Data)', 'createSampleDataAPI')
      .addToUi();
  } catch (e) {
    // ป้องกันข้อผิดพลาดกรณีไม่มีสิทธิ์
  }
}

function openWebAppDialog() {
  var activeUrl = ScriptApp.getService().getUrl();
  if (!activeUrl) {
    SpreadsheetApp.getUi().alert("กรุณาทำการ Deploy เว็บแอปก่อนใช้งาน (ไปที่ Deploy > New Deployment > Web App)");
    return;
  }
  
  var html = HtmlService.createHtmlOutput(
    "<div style='font-family: \"Sarabun\", sans-serif; text-align: center; padding: 15px;'>" +
    "  <p style='color: #1e293b; font-size: 14px; margin-bottom: 15px;'>คลิกปุ่มด้านล่างเพื่อเข้าใช้งานระบบดูคะแนน:</p>" +
    "  <a href='" + activeUrl + "' target='_blank' onclick='google.script.host.close();' style='display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2); transition: background-color 0.2s;'>🌐 เปิดระบบ GradeInsights</a>" +
    "</div>"
  )
  .setWidth(360)
  .setHeight(130);
  SpreadsheetApp.getUi().showModalDialog(html, "GradeInsights Portal");
}

/**
 * สร้างข้อมูลตัวอย่างลงใน Google Sheets เมื่อกดปุ่มหรือเรียกใช้
 */
function createSampleDataAPI() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. สร้างชีท Config
    var configSheet = ss.getSheetByName("Config");
    if (!configSheet) {
      configSheet = ss.insertSheet("Config");
      configSheet.appendRow(["teacherpin", "1234"]);
      configSheet.getRange("A1:B1").setFontWeight("bold");
    }
    
    // 2. สร้างชีท ม.4/1_คณิตศาสตร์
    var sheet1Name = "ม.4/1_คณิตศาสตร์";
    var sheet1 = ss.getSheetByName(sheet1Name);
    if (!sheet1) {
      sheet1 = ss.insertSheet(sheet1Name);
      var headers = ["student_id", "name", "classroom", "student_no", "subject_code", "subject_name", "midterm_score", "final_score", "ใบงาน 1 (10)", "จิตพิสัย (10)", "โครงงาน (20)", "comment"];
      sheet1.appendRow(headers);
      sheet1.getRange("A1:L1").setFontWeight("bold").setBackground("#f3f4f6");
      
      var rows = [
        ["69001", "นายสมชาย ใจดี", "ม.4/1", 1, "ค31201", "คณิตศาสตร์เพิ่มเติม", 18, 17, 9, 9, 18, "ตั้งใจเรียนดีมาก คอยช่วยเหลือเพื่อนสะกดแนวคิดทางคณิตศาสตร์"],
        ["69002", "นางสาวสมศรี สวยงาม", "ม.4/1", 2, "ค31201", "คณิตศาสตร์เพิ่มเติม", 12, 11, 8, 7, 14, "เกณฑ์ปานกลาง ควรทบทวนสูตรเพิ่มเติมและส่งงานให้ตรงเวลาขึ้น"],
        ["69003", "นายสมศักดิ์ รักดี", "ม.4/1", 3, "ค31201", "คณิตศาสตร์เพิ่มเติม", 8, 9, 5, 4, 10, "กลุ่มเสี่ยงวิกฤต! ขาดเรียนบ่อยครั้งและคะแนนเก็บต่ำกว่าเกณฑ์"]
      ];
      for (var i = 0; i < rows.length; i++) {
        sheet1.appendRow(rows[i]);
      }
    }
    
    // 3. สร้างชีท ม.5/1_คอมพิวเตอร์
    var sheet2Name = "ม.5/1_คอมพิวเตอร์";
    var sheet2 = ss.getSheetByName(sheet2Name);
    if (!sheet2) {
      sheet2 = ss.insertSheet(sheet2Name);
      var headers = ["student_id", "name", "classroom", "student_no", "subject_code", "subject_name", "midterm_score", "final_score", "ใบงาน 1 (10)", "จิตพิสัย (10)", "โครงงาน (20)", "comment"];
      sheet2.appendRow(headers);
      sheet2.getRange("A1:L1").setFontWeight("bold").setBackground("#f3f4f6");
      
      var rows = [
        ["68001", "นายเจษฎา ศรีสุข", "ม.5/1", 1, "ว31281", "คอมพิวเตอร์กราฟิก", 17, 16, 9, 8, 18, "มีความคิดสร้างสรรค์ในงานออกแบบดีเยี่ยม"]
      ];
      for (var i = 0; i < rows.length; i++) {
        sheet2.appendRow(rows[i]);
      }
    }
    
    // ลบแผ่นงานเดิมชื่อ Sheet1 (ถ้ามี และไม่มีข้อมูลใดๆ อยู่เลย)
    var defaultSheet = ss.getSheetByName("Sheet1");
    if (defaultSheet && defaultSheet.getLastRow() === 0 && defaultSheet.getLastColumn() === 0) {
      ss.deleteSheet(defaultSheet);
    }
    
    try {
      SpreadsheetApp.getUi().alert("✅ สร้างข้อมูลตัวอย่างใน Google Sheets เรียบร้อยแล้ว!\n- ห้อง ม.4/1_คณิตศาสตร์ (3 คน)\n- ห้อง ม.5/1_คอมพิวเตอร์ (1 คน)\n- ชีทตั้งค่า Config (รหัสครูคือ 1234)");
    } catch (e) {}
    
    return { status: "success" };
  } catch (err) {
    try {
      SpreadsheetApp.getUi().alert("❌ เกิดข้อผิดพลาด: " + err.message);
    } catch (e) {}
    return { status: "error", message: err.message };
  }
}

/**
 * แก้ไขชื่อคอลัมน์คะแนนเก็บในชีทที่กำหนด
 */
function renameColumnAPI(sheetName, oldColumnName, newColumnName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return {status: "error", message: "ไม่พบแผ่นงานย่อยชื่อ \"" + sheetName + "\""};
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    
    var colIndex = headers.indexOf(oldColumnName);
    if (colIndex !== -1) {
      sheet.getRange(1, colIndex + 1).setValue(newColumnName);
      return {status: "success"};
    } else {
      return {status: "error", message: "ไม่พบหัวข้อคะแนนดังกล่าวในชีท"};
    }
  } catch (err) {
    return {status: "error", message: "เกิดข้อผิดพลาดในการเปลี่ยนชื่อคอลัมน์: " + err.message};
  }
}

/**
 * ลบแถวรายชื่อนักเรียนในชีทที่กำหนด
 */
function deleteStudentAPI(sheetName, studentId, subjectCode) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return {status: "error", message: "ไม่พบแผ่นงานย่อยชื่อ \"" + sheetName + "\""};
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    
    var targetRowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(studentId) && String(data[i][4]) === String(subjectCode)) {
        targetRowIndex = i + 1; // 1-based index
        break;
      }
    }
    
    if (targetRowIndex !== -1) {
      sheet.deleteRow(targetRowIndex);
      return {status: "success"};
    } else {
      return {status: "error", message: "ไม่พบนักเรียนดังกล่าวในชีท"};
    }
  } catch (err) {
    return {status: "error", message: "เกิดข้อผิดพลาดในการลบนักเรียน: " + err.message};
  }
}

/**
 * ดึงข้อมูลชื่อวิชาที่ครูตั้งค่าเองในชีท Config
 */
function getCustomSubjectNames() {
  var customNames = {};
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Config");
    if (!sheet) return customNames;
    
    var data = sheet.getDataRange().getValues();
    for (var i = 0; i < data.length; i++) {
      var key = String(data[i][0]).trim();
      var val = String(data[i][1]).trim();
      if (key.indexOf("subjectname:") === 0) {
        var sheetName = key.substring("subjectname:".length);
        customNames[sheetName] = val;
      }
    }
  } catch (e) {}
  return customNames;
}

/**
 * บันทึกชื่อวิชาที่ครูตั้งค่าเองลงในชีท Config
 */
function saveCustomSubjectNameAPI(sheetName, customName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Config");
    if (!sheet) {
      sheet = ss.insertSheet("Config");
    }
    
    var data = sheet.getDataRange().getValues();
    var keyToFind = "subjectname:" + sheetName;
    var targetRow = -1;
    
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() === keyToFind) {
        targetRow = i + 1; // 1-based index
        break;
      }
    }
    
    if (customName && customName.trim()) {
      if (targetRow !== -1) {
        sheet.getRange(targetRow, 2).setValue(customName.trim());
      } else {
        sheet.appendRow([keyToFind, customName.trim()]);
      }
    } else {
      // If customName is empty, delete the row
      if (targetRow !== -1) {
        sheet.deleteRow(targetRow);
      }
    }
    return { status: "success" };
  } catch (err) {
    return { status: "error", message: "เกิดข้อผิดพลาดในการบันทึกชื่อวิชา: " + err.message };
  }
}

/**
 * บันทึกรายงานสรุปผลสัมฤทธิ์ทางการเรียนลงในแผ่นงานแยกต่างหาก (ชีท "สรุปผลสัมฤทธิ์")
 */
function saveSummaryReportAPI(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = "สรุปผลสัมฤทธิ์";
    var sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      sheet.clear();
      // Remove all merges
      var maxRows = sheet.getMaxRows();
      var maxCols = sheet.getMaxColumns();
      sheet.getRange(1, 1, maxRows, maxCols).breakApart();
    } else {
      sheet = ss.insertSheet(sheetName);
    }
    
    // Set active sheet
    sheet.showSheet();
    
    // Title
    sheet.getRange("A1").setValue("รายงานผลสัมฤทธิ์ทางการเรียนและการประเมินคุณลักษณะ").setFontSize(16).setFontWeight("bold");
    sheet.getRange("A2").setValue("สรุปสถิติจำนวนระดับผลการเรียนแยกตามกลุ่มวิชาและห้องเรียน (อัปเดตเมื่อ " + new Date().toLocaleString("th-TH") + ")").setFontSize(11).setFontColor("#475569");
    
    var currentRow = 4;
    
    // ------------------ Table 1: Grade Summary ------------------
    sheet.getRange(currentRow, 1).setValue("1. สรุปผลการตัดสินผลการเรียน").setFontSize(12).setFontWeight("bold");
    currentRow++;
    
    // Headers
    sheet.getRange(currentRow, 1, 2, 1).merge().setValue("ที่").setHorizontalAlignment("center").setVerticalAlignment("middle");
    sheet.getRange(currentRow, 2, 2, 1).merge().setValue("วิชา / รหัส").setHorizontalAlignment("left").setVerticalAlignment("middle");
    sheet.getRange(currentRow, 3, 2, 1).merge().setValue("รวม (คน)").setHorizontalAlignment("center").setVerticalAlignment("middle");
    sheet.getRange(currentRow, 4, 1, 10).merge().setValue("ระดับผลการเรียน").setHorizontalAlignment("center");
    
    var gradesHeader = ["4", "3.5", "3", "2.5", "2", "1.5", "1", "0", "ร", "มส"];
    for (var i = 0; i < gradesHeader.length; i++) {
      sheet.getRange(currentRow + 1, 4 + i).setValue(gradesHeader[i]).setHorizontalAlignment("center");
    }
    
    sheet.getRange(currentRow, 1, 2, 13).setBackground("#f1f5f9").setFontWeight("bold").setBorder(true, true, true, true, true, true);
    currentRow += 2;
    
    // Rows
    data.gradeRows.forEach(function(row) {
      sheet.getRange(currentRow, 1).setValue(row.no).setHorizontalAlignment("center");
      sheet.getRange(currentRow, 2).setValue(row.subject).setHorizontalAlignment("left");
      sheet.getRange(currentRow, 3).setValue(row.total).setHorizontalAlignment("center");
      sheet.getRange(currentRow, 4).setValue(row.g4).setHorizontalAlignment("center");
      sheet.getRange(currentRow, 5).setValue(row.g3_5).setHorizontalAlignment("center");
      sheet.getRange(currentRow, 6).setValue(row.g3).setHorizontalAlignment("center");
      sheet.getRange(currentRow, 7).setValue(row.g2_5).setHorizontalAlignment("center");
      sheet.getRange(currentRow, 8).setValue(row.g2).setHorizontalAlignment("center");
      sheet.getRange(currentRow, 9).setValue(row.g1_5).setHorizontalAlignment("center");
      sheet.getRange(currentRow, 10).setValue(row.g1).setHorizontalAlignment("center");
      sheet.getRange(currentRow, 11).setValue(row.g0).setHorizontalAlignment("center");
      sheet.getRange(currentRow, 12).setValue(row.gR).setHorizontalAlignment("center");
      sheet.getRange(currentRow, 13).setValue(row.gMS).setHorizontalAlignment("center");
      
      sheet.getRange(currentRow, 1, 1, 13).setBorder(true, true, true, true, true, true);
      currentRow++;
    });
    
    // Totals
    sheet.getRange(currentRow, 1, 1, 2).merge().setValue("รวม").setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 3).setValue(data.gradeTotals.total).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 4).setValue(data.gradeTotals.g4).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 5).setValue(data.gradeTotals.g3_5).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 6).setValue(data.gradeTotals.g3).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 7).setValue(data.gradeTotals.g2_5).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 8).setValue(data.gradeTotals.g2).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 9).setValue(data.gradeTotals.g1_5).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 10).setValue(data.gradeTotals.g1).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 11).setValue(data.gradeTotals.g0).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 12).setValue(data.gradeTotals.gR).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 13).setValue(data.gradeTotals.gMS).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 1, 1, 13).setBackground("#f8fafc").setFontWeight("bold").setBorder(true, true, true, true, true, true);
    currentRow++;
    
    // Percentages
    sheet.getRange(currentRow, 1, 1, 2).merge().setValue("ร้อยละ").setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 3).setValue(data.gradePcts.total).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 4).setValue(data.gradePcts.g4).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 5).setValue(data.gradePcts.g3_5).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 6).setValue(data.gradePcts.g3).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 7).setValue(data.gradePcts.g2_5).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 8).setValue(data.gradePcts.g2).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 9).setValue(data.gradePcts.g1_5).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 10).setValue(data.gradePcts.g1).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 11).setValue(data.gradePcts.g0).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 12).setValue(data.gradePcts.gR).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 13).setValue(data.gradePcts.gMS).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 1, 1, 13).setBackground("#e2e8f0").setFontWeight("bold").setBorder(true, true, true, true, true, true);
    
    currentRow += 3;
    
    // ------------------ Table 2: Evaluation Summary ------------------
    sheet.getRange(currentRow, 1).setValue("2. สรุปผลการประเมินการอ่าน คิดวิเคราะห์ เขียน และคุณลักษณะอันพึงประสงค์").setFontSize(12).setFontWeight("bold");
    currentRow++;
    
    // Headers
    sheet.getRange(currentRow, 1, 2, 1).merge().setValue("ที่").setHorizontalAlignment("center").setVerticalAlignment("middle");
    sheet.getRange(currentRow, 2, 2, 1).merge().setValue("วิชา / รหัส").setHorizontalAlignment("left").setVerticalAlignment("middle");
    sheet.getRange(currentRow, 3, 2, 1).merge().setValue("รวม (คน)").setHorizontalAlignment("center").setVerticalAlignment("middle");
    sheet.getRange(currentRow, 4, 1, 4).merge().setValue("การอ่าน/คิดวิเคราะห์/เขียน").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 8, 1, 4).merge().setValue("คุณลักษณะอันพึงประสงค์").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 12, 2, 1).merge().setValue("หมายเหตุ").setHorizontalAlignment("center").setVerticalAlignment("middle");
    
    var evalHeaders = ["3", "2", "1", "0", "3", "2", "1", "0"];
    for (var j = 0; j < evalHeaders.length; j++) {
      sheet.getRange(currentRow + 1, 4 + j).setValue(evalHeaders[j]).setHorizontalAlignment("center");
    }
    
    sheet.getRange(currentRow, 1, 2, 12).setBackground("#f1f5f9").setFontWeight("bold").setBorder(true, true, true, true, true, true);
    currentRow += 2;
    
    // Rows
    data.evalRows.forEach(function(row) {
      sheet.getRange(currentRow, 1).setValue(row.no).setHorizontalAlignment("center");
      sheet.getRange(currentRow, 2).setValue(row.subject).setHorizontalAlignment("left");
      sheet.getRange(currentRow, 3).setValue(row.total).setHorizontalAlignment("center");
      sheet.getRange(currentRow, 4).setValue(row.r3).setHorizontalAlignment("center");
      sheet.getRange(currentRow, 5).setValue(row.r2).setHorizontalAlignment("center");
      sheet.getRange(currentRow, 6).setValue(row.r1).setHorizontalAlignment("center");
      sheet.getRange(currentRow, 7).setValue(row.r0).setHorizontalAlignment("center");
      sheet.getRange(currentRow, 8).setValue(row.c3).setHorizontalAlignment("center");
      sheet.getRange(currentRow, 9).setValue(row.c2).setHorizontalAlignment("center");
      sheet.getRange(currentRow, 10).setValue(row.c1).setHorizontalAlignment("center");
      sheet.getRange(currentRow, 11).setValue(row.c0).setHorizontalAlignment("center");
      sheet.getRange(currentRow, 12).setValue(row.note).setHorizontalAlignment("center");
      
      sheet.getRange(currentRow, 1, 1, 12).setBorder(true, true, true, true, true, true);
      currentRow++;
    });
    
    // Totals
    sheet.getRange(currentRow, 1, 1, 2).merge().setValue("รวม").setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 3).setValue(data.evalTotals.total).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 4).setValue(data.evalTotals.r3).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 5).setValue(data.evalTotals.r2).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 6).setValue(data.evalTotals.r1).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 7).setValue(data.evalTotals.r0).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 8).setValue(data.evalTotals.c3).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 9).setValue(data.evalTotals.c2).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 10).setValue(data.evalTotals.c1).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 11).setValue(data.evalTotals.c0).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 12).setValue("").setFontWeight("bold");
    sheet.getRange(currentRow, 1, 1, 12).setBackground("#f8fafc").setFontWeight("bold").setBorder(true, true, true, true, true, true);
    currentRow++;
    
    // Percentages
    sheet.getRange(currentRow, 1, 1, 2).merge().setValue("ร้อยละ").setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 3).setValue(data.evalPcts.total).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 4).setValue(data.evalPcts.r3).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 5).setValue(data.evalPcts.r2).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 6).setValue(data.evalPcts.r1).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 7).setValue(data.evalPcts.r0).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 8).setValue(data.evalPcts.c3).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 9).setValue(data.evalPcts.c2).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 10).setValue(data.evalPcts.c1).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 11).setValue(data.evalPcts.c0).setFontWeight("bold").setHorizontalAlignment("center");
    sheet.getRange(currentRow, 12).setValue("").setFontWeight("bold");
    sheet.getRange(currentRow, 1, 1, 12).setBackground("#e2e8f0").setFontWeight("bold").setBorder(true, true, true, true, true, true);
    
    // Formatting
    sheet.autoResizeColumns(1, 13);
    sheet.setColumnWidth(2, 280); // Expand subject column
    
    return { status: "success", message: "บันทึกรายงานสรุปผลสัมฤทธิ์ลงในชีตเรียบร้อยแล้ว!" };
  } catch (err) {
    return { status: "error", message: "เกิดข้อผิดพลาดในการบันทึกรายงาน: " + err.message };
  }
}
