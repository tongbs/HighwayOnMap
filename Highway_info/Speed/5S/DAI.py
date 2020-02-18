import time, DAN, requests, random , json , math
import socket, re
from datetime import datetime

ServerURL = 'https://map.iottalk.tw' #with no secure connection
#ServerURL = 'https://DomainName' #with SSL connection
Reg_addr = 'HighwayFiveS' #if None, Reg_addr = MAC address

DAN.profile['dm_name']='Highway5S'
DAN.profile['df_list']=['Highway5S-TI']
DAN.profile['d_name']= None  # None for autoNaming
DAN.device_registration_with_retry(ServerURL, Reg_addr)

time.sleep(10)
class my_dictionary(dict):  
  
    # __init__ function  
    def __init__(self):  
        self = dict()  
          
    # Function to add key:value  
    def add(self, key, value):  
        self[key] = value

with open('fix1.json','r') as reader:
    jf = json.loads(reader.read())

def get_first_speedmsg():
    #request msg first 40km
    msgFromClient = "國5 S 0.0"
    bytesToSend = str.encode(msgFromClient)
    serverAddressPort = ("140.113.203.216",54710)
    bufferSize = 4096
    #create a UDP socket form client side
    UDPClientSocket = socket.socket(family = socket.AF_INET,type = socket.SOCK_DGRAM)
    #Send to server using created UDP socket
    UDPClientSocket.sendto(bytesToSend,serverAddressPort)
    UDPClientSocket.settimeout(5)
    try:
        msgFromServer = UDPClientSocket.recvfrom(bufferSize)
    except socket.timeout as error:
        print("first speed msg udp package lost")
        UDPClientSocket.close()
        get_first_speedmsg()
    msg = "{} ".format(msgFromServer[0])
    UDPClientSocket.close()
    return msg

def get_second_speedmsg():
    #request msg next 40km
    msgFromClient = "國5 S 40.0"
    bytesToSend = str.encode(msgFromClient)
    serverAddressPort = ("140.113.203.216",54710)
    bufferSize = 4096
    #create a UDP socket form client side
    UDPClientSocket = socket.socket(family = socket.AF_INET,type = socket.SOCK_DGRAM)
    #Send to server using created UDP socket
    UDPClientSocket.sendto(bytesToSend,serverAddressPort)
    UDPClientSocket.settimeout(5)
    try:
        msgFromServer = UDPClientSocket.recvfrom(bufferSize)
    except socket.timeout as error:
        print("second speed msg udp package lost")
        UDPClientSocket.close()
        get_second_speedmsg()
    msg = "{} ".format(msgFromServer[0])
    UDPClientSocket.close()
    return msg
    
while True:
    try:
    #Push data to a device feature called "Dummy_Sensor"
        s_0 = True
        s_40 = False
        if(s_0):
            s_40 = True
            
            newmsg = get_first_speedmsg()

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
            
        if(s_40):
            
            newmsg1 = get_second_speedmsg()

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
                DAN.push ('Highway5S-TI', lat, log,"國五S_kmp"+str(kmp),realtimespeed, datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                time.sleep(0.5)
        print("------------------------------------------------")
        first_forty_d.clear()
        second_forty_d.clear()
        time.sleep(180)

    except Exception as e:
        print(e)
        if str(e).find('mac_addr not found:') != -1:
            print('Reg_addr is not found. Try to re-register...')
            DAN.device_registration_with_retry(ServerURL, Reg_addr)
        else:
            print('Connection failed due to unknow reasons.')
            time.sleep(1)    
    time.sleep(0.2)
