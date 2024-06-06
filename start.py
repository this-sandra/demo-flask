from json import loads
from flask import Flask, flash, json, render_template, request
from db import get_db_connection
from datetime import datetime
from logging.handlers import RotatingFileHandler
import pandas as pd
import logging
import os

app = Flask(__name__)
app.json.ensure_ascii = False 

# secret_key and session_cookie are neseccary for the flash messages
secret = os.urandom(24)
app.secret_key = secret

app.config.update(
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
)

if not app.debug:

    if not os.path.exists('logs'):
        os.mkdir('logs')
    file_handler = RotatingFileHandler('logs/demo.log', maxBytes=10240,
                                       backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)

now = datetime.now()
dt_string = now.strftime("%Y/%m/%d %H:%M:%S")

get_db_connection()

# adding error pages
@app.errorhandler(404)
def page_not_found(e):
    app.logger.error(dt_string + ' 404 - Page not found. ' + 'Request URL: ' + request.url)  
    return render_template('404.html'), 404

@app.errorhandler(405)
def method_not_allowed(e):
    app.logger.error(dt_string + ' 405 - Method not allowed')  
    return render_template('405.html'), 405

@app.errorhandler(500)
def internal_server_error(e):
    app.logger.error(dt_string + ' 500 - Internal server error')  
    return render_template('500.html'), 500


@app.route('/demo/')
@app.route('/demo/', methods=('POST', 'GET'))
def index():

    # connect to the database 
    conn = get_db_connection()
  
    # create a cursor 
    cur = conn.cursor() 

    # check if years exist
    cur.execute(" SELECT DISTINCT isd.referenzzeitraum_jahr FROM inland_shipping_data isd ")
    result = cur.fetchall() 
    years_in_data = [x[0] for x in result]
    years_in_data.sort()

    year = 2022
    month = 1
    selected_year = 2022
    amount = "group_max" 

    months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

    if request.method == 'POST':
        # datatable form
        if request.form.get("year_1"):
            try:
                year = int(request.form.get("year_1"))
                years_in_data.index(year)
            except:
                year = 2022
                flash('Something went wrong. Wrong input type or year not matching!', 'error')
                app.logger.warning(dt_string + ' Request data: ' + request.form.get("year_1") + ' Input manipulation. Someone tryed to sent data through an unexpected way!')  

        if request.form.get("month"):
            try:
                month = int(request.form.get("month"))
                months.index(month)
            except:
                month = 1
                flash('Something went wrong. Wrong input type or wrong range!', 'error')
                app.logger.warning(dt_string + ' Request data: ' + request.form.get("month") + ' Input manipulation. Someone tryed to sent data through an unexpected way!')  
        
        # stacked bar chart form    
        if request.form.get("year"):
            try:
                selected_year = int(request.form.get("year"))
                years_in_data.index(selected_year)
            except:
                selected_year = 2022
                flash('Something went wrong. Wrong input type or year not matching!', 'error')
                app.logger.warning(dt_string + ' Request data: ' + request.form.get("year") + ' Input manipulation. Someone tryed to sent data through an unexpected way!')   

        # grouped bar chart form        
        if request.form.get("amount"):
            amount = request.form.get("amount")

            
    # data for the data table
    cur.execute("""
                    SELECT DISTINCT
                    *
                    FROM inland_shipping_data isd 
                    WHERE isd.referenzzeitraum_jahr = (%s)
                    AND isd.referenzzeitraum_monat = (%s);
                """, (year, month))
                    
    # fetch the data 
    data = cur.fetchall() 

    # for use in API - for data table
    sql_query_datatable = '''
                             SELECT DISTINCT
                             *
                             FROM inland_shipping_data isd 
                             WHERE isd.referenzzeitraum_jahr = {}
                             AND isd.referenzzeitraum_monat = {};
                          '''.format(year, month)
    
    data_raw_sql_table = pd.read_sql_query(sql_query_datatable, conn)
    
    global json_data_table
    data_to_json_table = data_raw_sql_table.to_json(orient="table")
    json_data_table = loads(data_to_json_table) 

    evas_sql_query = ('''SELECT DISTINCT isd.evas, isd.evas_label
                         FROM inland_shipping_data isd 
                     ''') 
    
    evas_raw_sql = pd.read_sql_query(evas_sql_query, conn)
    evas_df = pd.DataFrame(evas_raw_sql, columns = ['evas_label'])
    evas = str(evas_df.values).replace("[", "").replace("]", "")
   
    # data for stacked barchart
    sql_query = '''SELECT DISTINCT
                        isd.schiffsart_label as schiffsart, 
                        isd.nst2007_label,
                   COUNT(isd.nst2007_label) as amount
                   FROM inland_shipping_data isd 
                   WHERE isd.referenzzeitraum_jahr = {}
                   GROUP BY isd.schiffsart_label, 
                            isd.nst2007_label;
                   '''.format(selected_year)
    
    data_raw_sql = pd.read_sql_query(sql_query, conn)
                    
    # fetch the data 
    df = pd.DataFrame(data_raw_sql, columns = ['schiffsart', 'nst2007_label', 'amount'])

    df['nst2007_label'] = df['nst2007_label'].str.replace(',','-')
    df = df.loc[(df['amount'] > 500)]

    df_pivot = df.pivot(index="schiffsart", columns="nst2007_label", values="amount").fillna(0).astype(int)

    df_pivot.columns.name = None

    # for use in API - for stacked bar chart
    global json_data_stacked
    stacked_to_json = df_pivot.to_json(orient="index")
    json_data_stacked = loads(stacked_to_json)
    
    # create csv from pandas df
    csv_data = df_pivot.to_csv(sep=',', encoding='utf-8')

    # import ipdb; ipdb.set_trace()

    # data for grouped barchart
    sql_query_grouped = '''SELECT DISTINCT
                                isd.referenzzeitraum_jahr as year,
                                isd.nst2007_label as product,
                           COUNT(isd.nst2007_label) as amount
                           FROM inland_shipping_data isd 
                           WHERE isd.referenzzeitraum_jahr in (2022, 2021, 2020)
                           GROUP BY isd.referenzzeitraum_jahr, 
                                    isd.nst2007_label;
                           '''
    
    data_raw_sql_grouped = pd.read_sql_query(sql_query_grouped, conn)
                    
    # fetch the data 
    df_grouped = pd.DataFrame(data_raw_sql_grouped, columns = ['year', 'product', 'amount'])

    df_grouped['product'] = df_grouped['product'].str.replace(',','-')
    
 
    match amount:
        case "group_max":
            prod_value = '1001 - 7000'
            df_grouped = df_grouped.loc[df_grouped['amount'] > 1000]
        case "group_mid":
            prod_value = '501 - 1000'
            df_grouped = df_grouped.loc[(df_grouped['amount'] > 500) & (df_grouped['amount'] < 1001)]
        case "group_min2":
            prod_value = '101 - 500'
            df_grouped = df_grouped.loc[(df_grouped['amount'] > 100) & (df_grouped['amount'] < 501)]
        case "group_min1":
            prod_value = '0 - 100'
            df_grouped = df_grouped.loc[df_grouped['amount'] < 101]   
        case _:
            prod_value = '0 - 100'
            flash('Something went wrong. This input was not expected!', 'error')
            app.logger.warning(dt_string + ' Input manipulation. Someone tryed to sent data through an unexpected way!')  


        
    # create csv from pandas df
    csv_data_grouped = df_grouped.to_csv(sep=',', index=False, encoding='utf-8')

    # for use in API - for stacked bar chart
    global json_data_grouped
    grouped_to_json = df_grouped.to_json(orient="records")
    json_data_grouped = loads(grouped_to_json)
    

    # import ipdb; ipdb.set_trace()

    # close the cursor and connection 
    cur.close() 
    conn.close() 

    return render_template('index.html', 
                           data=data, 
                           evas=evas,
                           csv_data=csv_data,
                           selected_year=selected_year,
                           months=months,
                           year=year,
                           month=month,
                           csv_data_grouped=csv_data_grouped,
                           prod_value=prod_value)




@app.route('/demo/api/stacked_bar_chart')
def api_stacked():
    json_formatted_str = json.dumps(json_data_stacked, ensure_ascii=False).encode('utf8')

    response = app.response_class(
        response=json_formatted_str,
        status=200,
        mimetype='application/json'
    )

    return (response)


@app.route('/demo/api/data_table')
def api_table():
    json_formatted_str = json.dumps(json_data_table, ensure_ascii=False).encode('utf8')

    response_table = app.response_class(
        response=json_formatted_str,
        status=200,
        mimetype='application/json'
    )

    return (response_table)


@app.route('/demo/api/data_grouped')
def api_grouped():
    json_formatted_str = json.dumps(json_data_grouped, ensure_ascii=False).encode('utf8')

    response_grouped = app.response_class(
        response=json_formatted_str,
        status=200,
        mimetype='application/json'
    )

    return (response_grouped)


# development
# see application under http://127.0.0.1:5000/demo/
if __name__ == '__main__':
    app.run()


# production
# if __name__ == "__main__":
#  app.run(host='0.0.0.0', port=1024, debug=True)
