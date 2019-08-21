import time, DAN, requests, random , json , math
import socket, re
from datetime import datetime

ServerURL = 'https://test.iottalk.tw' #with no secure connection
#ServerURL = 'https://DomainName' #with SSL connection
Reg_addr = 'highwayfiveS' #if None, Reg_addr = MAC address

DAN.profile['dm_name']='highway5S'
DAN.profile['df_list']=['highway5Sdata']
DAN.profile['d_name']= None  # None for autoNaming
DAN.device_registration_with_retry(ServerURL, Reg_addr)

#time.sleep(10)
class my_dictionary(dict):  
  
    # __init__ function  
    def __init__(self):  
        self = dict()  
          
    # Function to add key:value  
    def add(self, key, value):  
        self[key] = value

with open('fixed_5S_location.json','r') as reader:
    jf = json.loads(reader.read())

def get_speedmsg(req_msg):
    tmp_msg = req_msg             #如果封包遺失可以透過tmp_msg來重新請求
    msgFromClient = req_msg
    bytesToSend = str.encode(msgFromClient)
    serverAddressPort = ("140.113.203.216",54710)
    bufferSize = 4096
    #create a UDP socket form client side
    UDPClientSocket = socket.socket(family = socket.AF_INET,type = socket.SOCK_DGRAM)
    #Send to server using created UDP socket
    UDPClientSocket.sendto(bytesToSend,serverAddressPort)
    UDPClientSocket.settimeout(3)
    try:
        msgFromServer = UDPClientSocket.recvfrom(bufferSize)
    except socket.timeout as error:
        print("first speed msg udp package lost")
        UDPClientSocket.close()
        get_speedmsg(tmp_msg)
    msg = "{} ".format(msgFromServer[0])
    UDPClientSocket.close()
    return msg

while True:
    try:
    #Push data to a device feature called "Dummy_Sensor"
        speedmsg_0 = True
        speedmsg_40 = False
        if(speedmsg_0):
            speedmsg_40 = True
            
            newmsg = get_speedmsg("國5 S 0.0")
            newmsg = newmsg.replace("n","i")
            newmsg = newmsg.replace("t","j")
            newmsg = newmsg.replace("\i",",")
            newmsg = newmsg.replace("\j",":")
            first_forty = newmsg.split(',')   #first_forty store前40km data
            first_forty.pop()
            first_forty.pop(0)
            #print(first_forty)

            first_forty_d = my_dictionary();  #use dictionary to store kmp/speed
            for i in range(len(first_forty)):
                kmp1 = first_forty[i].split(':')
                first_forty_d.add(math.floor(float(kmp1[0])),kmp1[1])
            
        if(speedmsg_40):
            
            newmsg1 = get_speedmsg("國5 S 40.0")
            newmsg1 = newmsg1.replace("n","i")
            newmsg1 = newmsg1.replace("t","j")
            newmsg1 = newmsg1.replace("\i",",")
            newmsg1 = newmsg1.replace("\j",":")
            second_forty = newmsg1.split(',')   #first_forty store前40km data
            second_forty.pop()
            second_forty.pop(0)
            #print(second_forty)

            second_forty_d = my_dictionary();  #use dictionary to store kmp/speed
            for i in range(len(second_forty)):
                kmp1 = second_forty[i].split(':')
                second_forty_d.add(math.floor(float(kmp1[0])),kmp1[1])
        print("-----------json match--------------------")
        a = len(jf['segmentList'])
        for i in range(0,a):
            b = len(jf['segmentList'][i]['nodeList'])
            for j in range(0,b):
                ID = jf['segmentList'][i]['nodeList'][j][0]
                lat = jf['segmentList'][i]['nodeList'][j][1]
                log = jf['segmentList'][i]['nodeList'][j][2]
                kmp = math.floor(jf['segmentList'][i]['nodeList'][j][3])
                if(kmp<40):
                    for k,v in first_forty_d.items():
                        if (kmp == k):
                            realtimespeed = v
                            break;
                        else:
                            if(kmp < k):
                                realtimespeed = v;
                                break;
                else:
                    for k,v in second_forty_d.items():
                        if(kmp == k):
                            realtimespeed = v
                            break;
                        else:
                            if(kmp<k):
                                realtimespeed = v
                                break;
                print(ID,lat,log,kmp,realtimespeed,datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                DAN.push ('highway5Sdata', lat, log,"國五南下 "+str(kmp)+" km",realtimespeed, datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                time.sleep(0.1)
        print("------------------------------------------------")
        first_forty_d.clear()
        second_forty_d.clear()
        time.sleep(120)

    except Exception as e:
        print(e)
        if str(e).find('mac_addr not found:') != -1:
            print('Reg_addr is not found. Try to re-register...')
            DAN.device_registration_with_retry(ServerURL, Reg_addr)
        else:
            print('Connection failed due to unknow reasons.')
            time.sleep(1)    
    time.sleep(0.2)
