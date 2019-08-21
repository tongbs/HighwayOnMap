#!/usr/bin/env python
# -*- coding: utf-8 -*- 
import time, requests, random, json, re
from datetime import datetime, timedelta
from sqlalchemy import Column, String, Float, Integer, DATETIME, and_, func
from flask import Flask, jsonify, render_template, request, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, emit
from sqlalchemy.dialects.mysql import DOUBLE
import DAI
from flask_httpauth import HTTPBasicAuth
from ServerConfig import users, MapServerPort
from init_db import icon_define_table, static_icon_table, data_pull_from_iottalk, iottalk_data_latest_record, app, db, socketio

auth = HTTPBasicAuth()

@auth.get_password
def get_pw(username):
    if username in users:
        return users.get(username)
    return None

@app.route('/secure/_take_all_iottalk_data')
def take_all_iottalk_data():
    all_iottalk_data_list = []

    c = db.session.query(iottalk_data_latest_record).all()
    for row in c:
        all_iottalk_data_list.append({
            'app_num': row.app_num,
            'name': row.name,
            'lat': float(row.lat),
            'lng': float(row.lng),
            'value': row.value,
            'time': row.time - timedelta(hours=8) #回傳中原標準時間
        })

    return jsonify(result = all_iottalk_data_list)

@app.route('/secure/_set_tracking_id')
def set_tracking_id():
    app = request.args.get('app', type=str)
    name = request.args.get('name', type=str)

    app_num = db.session.query(icon_define_table).filter(icon_define_table.app == app).first().number

    tracking_target = db.session.query(iottalk_data_latest_record).filter(and_(iottalk_data_latest_record.app_num == app_num, iottalk_data_latest_record.name == name)).first()

    if tracking_target == None:
        tracking_target = db.session.query(iottalk_data_latest_record).filter(iottalk_data_latest_record.app_num == app_num)
        max_tracking_target = -1
        for c in tracking_target:
            c.value = re.sub("\D", "", c.value) #prevent invalid value
            if int(c.value) > max_tracking_target:
                max_tracking_target = int(c.value)
        tracking_target.value = max_tracking_target + 1
    print(tracking_target.value)
    
    tracking_list_with_id = []
    
    tracking_list_with_id.append({
        'app_num': app_num,
        'id': tracking_target.value
    })

    return jsonify(result = tracking_list_with_id)

@app.route('/secure/_del_movable_icon')
def del_movable_icon():

    app_num = request.args.get('app_num', type=int)
    name = request.args.get('name', type=str)

    db.session.query(data_pull_from_iottalk).filter(and_(data_pull_from_iottalk.app_num == app_num, data_pull_from_iottalk.name == name)).delete()
    db.session.commit()

    db.session.query(iottalk_data_latest_record).filter(and_(iottalk_data_latest_record.app_num == app_num, iottalk_data_latest_record.name == name)).delete()
    db.session.commit()

    db.session.query(static_icon_table).filter(and_(static_icon_table.app_num == app_num, static_icon_table.name == name)).delete()
    db.session.commit()

    return jsonify(result = True)

@app.route('/secure/_del_static_icon')
def del_static_icon():

    number = request.args.get('number', 0, type=int)

    static_icon = db.session.query(static_icon_table).filter(static_icon_table.number == number).first()

    db.session.query(data_pull_from_iottalk).filter(and_(data_pull_from_iottalk.app_num == static_icon.app_num, data_pull_from_iottalk.name == static_icon.name)).delete()
    db.session.commit()

    db.session.query(iottalk_data_latest_record).filter(and_(iottalk_data_latest_record.app_num == static_icon.app_num, iottalk_data_latest_record.name == static_icon.name)).delete()
    db.session.commit()

    db.session.query(static_icon_table).filter(static_icon_table.number == number).delete()
    db.session.commit()

    return jsonify(result = True)

@app.route('/secure/_modify_static_icon')
def modify_static_icon():
    number = request.args.get('number', 0, type=int)
    # app_num = request.args.get('app_num', type=int)
    name = request.args.get('name', type=str)
    lat = request.args.get('lat', 0, type=float)
    lng = request.args.get('lng', 0, type=float)
    description = request.args.get('description', type=str)

    db.session.query(static_icon_table).filter(static_icon_table.number == number).update(dict(name=name, lat=lat, lng=lng, description=description))
    db.session.commit()

    return jsonify(result = True)

@app.route('/secure/_take_all_static_icon')
def take_all_static_icon():
    c = db.session.query(static_icon_table).all()
    all_static_icon_list = []
    
    for row in c:
        all_static_icon_list.append({
            'number': row.number,
            'app_num': row.app_num,
            'name': row.name,
            'lat': float(row.lat),
            'lng': float(row.lng),
            'description': row.description
        })

    return jsonify(result = all_static_icon_list)

@app.route('/secure/_add_static_icon')
def add_static_icon():
    app_num = request.args.get('app_num', type=int)
    name = request.args.get('name', type=str)
    lat = request.args.get('lat', 0, type=float)
    lng = request.args.get('lng', 0, type=float)
    description = request.args.get('description', type=str)

    new_data = static_icon_table(app_num=app_num, name=name, lat=lat, lng=lng, description=description)
    db.session.add(new_data)
    db.session.commit()

    return jsonify(result = True)


@app.route('/secure/_del_app')
def del_app():
    number = request.args.get('number', 0, type=int)

    db.session.query(icon_define_table).filter(icon_define_table.number == number).delete()
    db.session.commit()

    db.session.query(static_icon_table).filter(static_icon_table.app_num == number).delete()
    db.session.commit()

    db.session.query(data_pull_from_iottalk).filter(data_pull_from_iottalk.app_num == number).delete()
    db.session.commit()  

    db.session.query(iottalk_data_latest_record).filter(iottalk_data_latest_record.app_num == number).delete()
    db.session.commit() 

    DAI.iottalk_device_feature_update()
    return jsonify(result = True)

@app.route('/secure/_modify_app')
def modify_app():
    number = request.args.get('number', type=int)
    app = request.args.get('app', type=str)
    kind = request.args.get('kind', 0, type=int)
    mobility = request.args.get('mobility', type=str)
    icon = request.args.get('icon', type=str)
    picture = request.args.get('picture', type=str)
    visual = request.args.get('visual', type=str)
    color_min = request.args.get('color_min', default=None, type=int)
    color_max = request.args.get('color_max', default=None, type=int)
    quick_access = request.args.get('quick_access', 0, type=float)

    db.session.query(icon_define_table).filter(icon_define_table.number == number).update(dict(app=app, kind=kind, mobility=mobility, icon=icon, picture=picture, visual=visual, color_min=color_min, color_max=color_max, quick_access=quick_access))
    db.session.commit()

    DAI.iottalk_device_feature_update()
    return jsonify(result = True)

@app.route('/secure/_take_all_app')
def take_all_app():
    c = db.session.query(icon_define_table).order_by(icon_define_table.app).all()
    all_app_list = []
    
    for row in c:
        all_app_list.append({
            'number': row.number,
            'app': row.app,
            'kind': row.kind,
            'mobility': row.mobility,
            'icon': row.icon,
            'picture': row.picture,
            'visual': row.visual,
            'color_min': row.color_min,
            'color_max':row.color_max,
            'quick_access': row.quick_access
        })
    return jsonify(result = all_app_list)

@app.route('/secure/_add_app')
def add_app():
    app = request.args.get('app', type=str)
    kind = request.args.get('kind', 0, type=int)
    mobility = request.args.get('mobility', type=str)
    icon = request.args.get('icon', type=str)
    picture = request.args.get('picture', type=str)
    visual = request.args.get('visual', type=str)
    color_min = request.args.get('color_min', default=None, type=int)
    color_max = request.args.get('color_max', default=None, type=int)
    quick_access = request.args.get('quick_access', 0, type=float)

    new_data = icon_define_table(app=app, kind=kind, mobility=mobility, icon=icon, picture=picture, visual=visual, color_min=color_min, color_max=color_max, quick_access=quick_access)
    db.session.add(new_data)
    db.session.commit()

    DAI.iottalk_device_feature_update()
    return jsonify(result = True)

@app.route('/secure/_take_obstacles')
def take_obstacles():
    c = db.session.query(icon_define_table).filter_by(app = 'Obstacle').first()
    if c == None:
        return jsonify(result = "NoObstacle")
    else:
        c = db.session.query(static_icon_table).filter_by(app_num = c.number).all()

        recent_histories = []
        
        for row in c:
            recent_histories.append({
                'lat': float(row.lat),
                'lon': float(row.lng),
            })
        return jsonify(result = recent_histories)

@app.route('/secure/history')
def history():
    app_num = request.args.get('app_num', 0, type=int)
    name = request.args.get('name', 0, type=str)
    val = request.args.get('time', 0, type=int)
    if(val == 0):
        c = db.session.query(data_pull_from_iottalk).filter(and_(data_pull_from_iottalk.app_num == app_num, data_pull_from_iottalk.name == name)).order_by(data_pull_from_iottalk.number.desc()).first()
        recent_histories = []
        recent_histories.append({
            'lat': c.lat,
            'lng': c.lng,
            'value': c.value,
            'time': c.time - timedelta(hours=8) #回傳中原標準時間
        })
        return jsonify(result = recent_histories)

    if(val == 1):
        val = timedelta(seconds=35)#timedelta(minutes=1)
    if(val == 2):
        val = timedelta(hours=1)

    right_now = datetime.now()
    start_time = right_now - val
    c = db.session.query(data_pull_from_iottalk).filter(and_(data_pull_from_iottalk.app_num == app_num, data_pull_from_iottalk.name == name, data_pull_from_iottalk.time.between(start_time, right_now)))

    recent_histories = []

    for row in c:
        recent_histories.append({
            'lat': float(row.lat),
            'lng': float(row.lng),
            'value': row.value,
            'time': row.time - timedelta(hours=8) #回傳中原標準時間
        })
    return jsonify(result = recent_histories)

# @app.route('/tracking/<username>')
# def tracking():
#     return render_template('index.html', tracking=True, username=username)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/admin')
@auth.login_required
def admin():
    return render_template('admin.html')

@app.route('/secure/endpoint/pull', methods=['POST'])
def my_test_endpoint():
    try:
        app_num = request.form['app_num']
        lat = request.form['lat']
        lng = request.form['lng']
        name = request.form['name']
        time = request.form['time']
        value = request.form['value']

#-----------------------------------------------------------
#-----------------------------------更改處--------------------
#-----------------------------------------------------------
        if(time[0].isdigit()):
            time = datetime.strptime(time, "%Y-%m-%d %H:%M:%S")

            socketio.emit('server_response', {'data': [app_num, lat, lng, name, value, str(time)]}, namespace='/hpc', broadcast=True)
            socketio.sleep(0)
            # 创建session对象:
            #session = DBSession()
            # 创建新User对象:
            new_data = data_pull_from_iottalk(app_num=app_num, lat=lat, lng=lng, name=name, value=value, time=time)
            # 添加到session:
            db.session.add(new_data)
            # 提交即保存到数据库:
            db.session.commit()
            # 关闭session:
            #session.close()

            print(app_num, lat, lng, name, value, time)

            # Update iottalk_data_latest_record table
            c = db.session.query(iottalk_data_latest_record).filter(and_(iottalk_data_latest_record.app_num == app_num, iottalk_data_latest_record.name == name)).update(dict(lat=lat, lng=lng, value=value, time=time))
            
            if c != 0:
                db.session.commit()
                print('Update iottalk_data_latest_record table success')
            else:
                new_data = iottalk_data_latest_record(app_num=app_num, lat=lat, lng=lng, name=name, value=value, time=time)
                db.session.add(new_data)
                db.session.commit()
                print('Add iottalk_data_latest_record table success')


            # Update static_icon_table
            c = db.session.query(icon_define_table).filter(icon_define_table.number == app_num).first().kind
            if c >= 5 and c <= 8:
                c = db.session.query(static_icon_table).filter(and_(static_icon_table.app_num == app_num, static_icon_table.name == name)).update(dict(lat=lat, lng=lng))
                
                if c != 0:
                    db.session.commit()
                    print('Update static_icon_table success')
                else:
                    new_data = static_icon_table(app_num=app_num, name=name, lat=lat, lng=lng, description=name)
                    db.session.add(new_data)
                    db.session.commit()
                    print('Add static_icon_table success')
#-----------------------------------------------------------
#-----------------------------------更改處--------------------
#-----------------------------------------------------------
        else:
            socketio.emit('server_response', {'data': [app_num, lat, lng, name, value, str(time)]}, namespace='/hpc', broadcast=True)
            socketio.sleep(0)
            if value == '0':
                new_data = static_icon_table(app_num=app_num, name=name, lat=lat, lng=lng, description=time)
                db.session.add(new_data)
                db.session.commit()
            else:
                db.session.query(static_icon_table).filter(and_(static_icon_table.app_num == app_num, static_icon_table.name == name)).delete()
                db.session.commit() 
        
    except Exception as e:
        print(e)

    finally:
        result = {
            'status': 'ok'
        }
        return jsonify(result)


@app.after_request
def add_header(r):
    r.headers["Cache-Control"] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    r.headers["Pragma"] = 'no-cache'
    r.headers["Expires"] = "-1"
    return r

with app.test_request_context():
    print(url_for('index'))
    print(url_for('admin'))


def map_server():
    # app.run('0.0.0.0', port=int("8866"),debug=True, threaded=True)
    socketio.run(app, host='0.0.0.0', port=int(MapServerPort), debug=True, use_reloader=False)#app.run(host='0.0.0.0', port=8866)
