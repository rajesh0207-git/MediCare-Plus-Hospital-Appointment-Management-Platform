from app.core.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text('SHOW TABLES'))
    tables = [r[0] for r in result]
    if 'patient_feedback' in tables:
        print('✅ patient_feedback table EXISTS')
    else:
        print('❌ patient_feedback table MISSING')
