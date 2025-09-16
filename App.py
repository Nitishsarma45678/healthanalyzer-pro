import os
from flask import Flask, render_template, request, redirect, url_for, flash
import sqlite3
import datetime
import re
import json

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this-to-random-string'

def init_db():
    conn = sqlite3.connect('health.db')
    c = conn.cursor()
    
    # Create table with new schema
    c.execute('''CREATE TABLE IF NOT EXISTS reports
                 (id INTEGER PRIMARY KEY, 
                  username TEXT, 
                  age INTEGER,
                  gender TEXT,
                  medical_conditions TEXT,
                  sugar_level REAL, 
                  urine_ph REAL, 
                  blood_pressure TEXT,
                  result TEXT,
                  risk_score INTEGER,
                  risk_factors TEXT,
                  recommendations TEXT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    
    # Add new columns if they don't exist (for existing databases)
    try:
        c.execute('ALTER TABLE reports ADD COLUMN age INTEGER')
    except sqlite3.OperationalError:
        pass  # Column already exists
        
    try:
        c.execute('ALTER TABLE reports ADD COLUMN gender TEXT')
    except sqlite3.OperationalError:
        pass
        
    try:
        c.execute('ALTER TABLE reports ADD COLUMN medical_conditions TEXT')
    except sqlite3.OperationalError:
        pass
        
    try:
        c.execute('ALTER TABLE reports ADD COLUMN risk_score INTEGER')
    except sqlite3.OperationalError:
        pass
        
    try:
        c.execute('ALTER TABLE reports ADD COLUMN risk_factors TEXT')
    except sqlite3.OperationalError:
        pass
        
    try:
        c.execute('ALTER TABLE reports ADD COLUMN recommendations TEXT')
    except sqlite3.OperationalError:
        pass
    
    conn.commit()
    conn.close()

def get_adjusted_thresholds(age, gender):
    """Get age and gender-adjusted health thresholds"""
    thresholds = {
        'sugar': {'low': 70, 'elevated': 100, 'high': 140, 'critical': 200},
        'bp': {'low': 90, 'elevated': 120, 'stage1': 140, 'stage2': 160},
        'urine_ph': {'low': 5.0, 'high': 8.0}
    }
    
    # Age adjustments
    if age < 18:
        thresholds['sugar']['elevated'] = 110
        thresholds['bp']['elevated'] = 110 + age
        thresholds['bp']['stage1'] = 130 + age
    elif age > 65:
        thresholds['sugar']['elevated'] = 110
        thresholds['bp']['elevated'] = 130
        thresholds['bp']['stage1'] = 150
    
    # Gender adjustments
    if gender == 'female' and age > 50:
        thresholds['bp']['elevated'] = 125
    
    return thresholds
def get_formatted_reports():
    """Get formatted reports with proper data handling"""
    try:
        conn = sqlite3.connect('health.db')
        conn.row_factory = sqlite3.Row  # This allows column access by name
        c = conn.cursor()
        c.execute('''SELECT id, username, age, gender, medical_conditions, 
                     sugar_level, urine_ph, blood_pressure, result, risk_score, 
                     risk_factors, recommendations, created_at 
                     FROM reports ORDER BY created_at DESC LIMIT 50''')
        reports = c.fetchall()
        conn.close()
        
        # Convert to list of dictionaries for easier template handling
        formatted_reports = []
        for report in reports:
            formatted_reports.append({
                'id': report['id'],
                'username': report['username'] or 'Unknown Patient',
                'age': report['age'] or 0,
                'gender': report['gender'] or 'Not specified',
                'medical_conditions': json.loads(report['medical_conditions'] or '[]'),
                'sugar_level': report['sugar_level'],
                'urine_ph': report['urine_ph'],
                'blood_pressure': report['blood_pressure'] or 'N/A',
                'result': report['result'] or 'Unknown',
                'risk_score': report['risk_score'] or 0,
                'risk_factors': json.loads(report['risk_factors'] or '[]'),
                'recommendations': json.loads(report['recommendations'] or '[]'),
                'created_at': report['created_at']
            })
        
        return formatted_reports
    except Exception as e:
        print(f"Error getting reports: {str(e)}")
        return []

def advanced_health_classification(sugar, urine_ph, bp_systolic, age, gender, medical_conditions):
    """Advanced health classification with personalized analysis"""
    risk_score = 0
    risk_factors = []
    recommendations = []
    
    thresholds = get_adjusted_thresholds(age, gender)
    
    # Blood sugar analysis
    if sugar > thresholds['sugar']['critical']:
        risk_score += 4
        risk_factors.append("Critical blood sugar level")
        recommendations.append("Seek immediate medical attention for blood sugar control")
    elif sugar > thresholds['sugar']['high']:
        risk_score += 2
        risk_factors.append("High blood sugar")
        recommendations.append("Consult endocrinologist for diabetes management")
    elif sugar > thresholds['sugar']['elevated']:
        risk_score += 1
        risk_factors.append("Elevated blood sugar")
        recommendations.append("Monitor diet, exercise regularly, recheck in 3 months")
    
    if sugar < thresholds['sugar']['low']:
        risk_score += 1
        risk_factors.append("Low blood sugar")
        recommendations.append("Monitor for hypoglycemia, carry glucose source")
    
    # Urine pH analysis
    if urine_ph < 4.5 or urine_ph > 8.5:
        risk_score += 2
        risk_factors.append("Severely abnormal urine pH")
        recommendations.append("Kidney function evaluation needed")
    elif urine_ph < 5.0 or urine_ph > 8.0:
        risk_score += 1
        risk_factors.append("Abnormal urine pH")
        recommendations.append("Monitor kidney health, increase water intake")
    
    # Blood pressure analysis
    if bp_systolic > thresholds['bp']['stage2']:
        risk_score += 3
        risk_factors.append("Stage 2 hypertension")
        recommendations.append("Immediate cardiology consultation required")
    elif bp_systolic > thresholds['bp']['stage1']:
        risk_score += 2
        risk_factors.append("Stage 1 hypertension")
        recommendations.append("Lifestyle changes and antihypertensive medication")
    elif bp_systolic > thresholds['bp']['elevated']:
        risk_score += 1
        risk_factors.append("Elevated blood pressure")
        recommendations.append("Reduce sodium, exercise regularly, monitor BP weekly")
    
    if bp_systolic < thresholds['bp']['low']:
        risk_score += 1
        risk_factors.append("Low blood pressure")
        recommendations.append("Stay hydrated, monitor for dizziness")
    
    # Medical conditions impact
    if 'diabetes' in medical_conditions:
        if sugar > thresholds['sugar']['elevated']:
            risk_score += 1
            recommendations.append("Diabetes management optimization needed")
    
    if 'hypertension' in medical_conditions:
        if bp_systolic > thresholds['bp']['elevated']:
            risk_score += 1
            recommendations.append("Blood pressure medication adjustment may be needed")
    
    # Age-specific recommendations
    if age > 65:
        recommendations.append("Regular geriatric health assessments recommended")
    elif age < 18:
        recommendations.append("Pediatric specialist consultation for ongoing monitoring")
    
    # Determine status
    if risk_score >= 7:
        status = "Critical"
        recommendations.insert(0, "URGENT: Seek immediate medical attention")
    elif risk_score >= 4:
        status = "Moderate"
        recommendations.insert(0, "Schedule doctor appointment within 1-2 weeks")
    elif risk_score >= 2:
        status = "Fair"
        recommendations.insert(0, "Monitor symptoms, lifestyle modifications recommended")
    else:
        status = "Good"
        recommendations = ["Continue healthy lifestyle habits", "Regular health checkups as recommended"]
    
    return {
        'status': status,
        'risk_score': min(risk_score, 10),
        'risk_factors': risk_factors,
        'recommendations': recommendations
    }

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        try:
            # Extract patient data
            username = request.form['username'].strip()
            age = int(request.form['age'])
            gender = request.form['gender']
            medical_conditions = request.form.getlist('medical_conditions')
            
            # Extract health parameters
            sugar_level = float(request.form['sugar'])
            urine_ph = float(request.form['urine_ph'])
            bp_systolic = int(request.form['bp_systolic'])
            bp_diastolic = int(request.form['bp_diastolic'])
            blood_pressure = f"{bp_systolic}/{bp_diastolic}"
            
            # Advanced health analysis
            analysis = advanced_health_classification(
                sugar_level, urine_ph, bp_systolic, age, gender, medical_conditions
            )
            
            # Save to database
            conn = sqlite3.connect('health.db')
            c = conn.cursor()
            c.execute('''INSERT INTO reports 
                        (username, age, gender, medical_conditions, sugar_level, urine_ph, 
                         blood_pressure, result, risk_score, risk_factors, recommendations) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                     (username, age, gender, json.dumps(medical_conditions), sugar_level, urine_ph, 
                      blood_pressure, analysis['status'], analysis['risk_score'],
                      json.dumps(analysis['risk_factors']), json.dumps(analysis['recommendations'])))
            conn.commit()
            conn.close()
            
            flash(f'✅ Health report saved! Status: {analysis["status"]} (Risk Score: {analysis["risk_score"]}/10)', 'success')
            
        except Exception as e:
            flash(f'❌ Error processing health report: {str(e)}', 'error')
        
        return redirect(url_for('index'))

    # Fetch reports
    reports = get_formatted_reports()
    return render_template('index.html', reports=reports)

if __name__ == '__main__':
    init_db()
    app.run(debug=True)
