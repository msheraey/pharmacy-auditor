UPDATE staff SET staff_code = REPLACE(staff_code, 'EMP', '') WHERE staff_code LIKE 'EMP%';
