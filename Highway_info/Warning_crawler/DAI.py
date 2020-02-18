import requests, json
from datetime import datetime

accident_list = {}
new_accidents = []

def crawl_site(url):
    headers = {
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36'
    }
    while 1:
        try:
            res = requests.get(url, headers=headers)
            return res
        except:
            print("crawler failed sorry!")
            print("Let me sleep 10 seconds")
            print("Zzzzz...")
            time.sleep(10)
            print("Nice sleep , let me continue....")
            continue

def get_element(site_json):
    global accident_list
    global new_accidents

    clear_state = ['排除', '結束', '未發現']

    for site in site_json:
        push_accident = []

        if site['areaNm'] == '蔣渭水高速公路-國道５號':

            now_time = datetime.now()

            accident_time = site['modDttm']
            accident_time = datetime.strptime(accident_time, '%Y-%m-%d %H:%M:%S.%f')

            time_diff = now_time - accident_time
            time_diff = time_diff.total_seconds()
            
            # new accident to insert
            if not any(x in site['comment'] for x in clear_state):

                if site['x1'] and site['y1'] and site['UID'] and site['roadtype'] and site['comment'] and site['roadtype'] != '阻塞':
                    
                    if site['UID'] not in accident_list and time_diff < 12*60*60:
                        # insert accident_list                        
                        accident_list[site['UID']] = site['modDttm']
                        
                        # print(json.dumps(site, indent=4, ensure_ascii=False)) 

                        accident_msg = site['roadtype'] + ':  [' + site['direction'] + ']' + site['comment']
                        push_accident.append(float(site['y1']))
                        push_accident.append(float(site['x1']))
                        push_accident.append(site['UID'])
                        push_accident.append(0)
                        push_accident.append(accident_msg)

                        new_accidents.append(push_accident)

                    elif site['UID'] in accident_list and time_diff > 12*60*60:
                        accident_list.pop(site['UID'], None)

                        accident_msg = site['roadtype'] + ':  [' + site['direction'] + ']' + site['comment']
                        
                        push_accident.append(float(site['y1']))
                        push_accident.append(float(site['x1']))
                        push_accident.append(site['UID'])
                        push_accident.append(1)
                        push_accident.append(accident_msg)

                        new_accidents.append(push_accident)


            # update/delete the existing accidents
            else:
                if site['x1'] and site['y1'] and site['UID'] and site['roadtype'] and site['comment']:
                    # print(json.dumps(site, indent=4, ensure_ascii=False)) 

                    if site['UID'] in accident_list:  
                        
                        accident_list.pop(site['UID'], None)


                        accident_msg = site['roadtype'] + ':  [' + site['direction'] + ']' + site['comment']
                        
                        push_accident.append(float(site['y1']))
                        push_accident.append(float(site['x1']))
                        push_accident.append(site['UID'])
                        push_accident.append(1)
                        push_accident.append(accident_msg)

                        new_accidents.append(push_accident)

    return new_accidents


# website = crawl_site('https://od.moi.gov.tw/MOI/v1/pbs')
# site_json = json.loads(website.text)
# new_accidents = get_element(site_json)
# print(accident_list)
# print(new_accidents)
# new_accidents = []
# print(new_accidents)
# print(len(new_accidents))


import time, DAN, requests, random
ServerURL = 'https://map.iottalk.tw' #with no secure connection
Reg_addr = 'AccidentInfo5' #if None, Reg_addr = MAC address

DAN.profile['dm_name'] = 'AccidentInfo5'
DAN.profile['df_list'] = ['AccidentInfo-TI']
DAN.profile['d_name'] = 'AccidentInfo5' # None for autoNaming
DAN.device_registration_with_retry(ServerURL, Reg_addr)

time.sleep(15)

while True:
    try:
        website = crawl_site('https://od.moi.gov.tw/MOI/v1/pbs')
        site_json = json.loads(website.text)
        new_accidents = get_element(site_json)

        print(accident_list)
        # print(new_accidents)

        for single_new_accident in new_accidents:
            print(single_new_accident)
            DAN.push ('AccidentInfo-TI', single_new_accident[0], single_new_accident[1], single_new_accident[2], single_new_accident[3], single_new_accident[4])   
            time.sleep(1)
        
        new_accidents = []
        print(new_accidents)

    except Exception as e:
        print(e)
        if str(e).find('mac_addr not found:') != -1:
            print('Reg_addr is not found. Try to re-register...')
            DAN.device_registration_with_retry(ServerURL, Reg_addr)
        else:
            print('Connection failed due to unknow reasons.')
            time.sleep(1)    
    
    time.sleep(180)
