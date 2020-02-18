import time, DAN, requests, random , json , math
import socket, re
from datetime import datetime

ServerURL = 'https://map.iottalk.tw' #with no secure connection
#ServerURL = 'https://DomainName' #with SSL connection
Reg_addr = 'HighwayFiveN' #if None, Reg_addr = MAC address

DAN.profile['dm_name']='Highway5N'
DAN.profile['df_list']=['Highway5N-TI']
DAN.profile['d_name']= None # None for autoNaming
DAN.device_registration_with_retry(ServerURL, Reg_addr)
time.sleep(10)
class my_dictionary(dict):
  
    # __init__ function  
    def __init__(self):  
        self = dict()  
          
    # Function to add key:value  
    def add(self, key, value):  
        self[key] = value

with open('fixN.json','r') as reader:
    jf = json.loads(reader.read())

def get_first_speedmsg():
    #request msg first 40km
    msgFromClient = "國5 N 15.0"
    bytesToSend = str.encode(msgFromClient)
    serverAddressPort = ("140.113.203.216",54710)
    bufferSize = 1024
    #create a UDP socket form client side
    UDPClientSocket = socket.socket(family = socket.AF_INET,type = socket.SOCK_DGRAM)
    #Send to server using created UDP socket
    UDPClientSocket.sendto(bytesToSend,serverAddressPort)
    UDPClientSocket.settimeout(5)
    try:
        msgFromServer = UDPClientSocket.recvfrom(bufferSize)
    except socket.timeout as error:
        UDPClientSocket.close()
        print("first speed msg udp package lost")
        get_first_speedmsg()
    msg = "{} ".format(msgFromServer[0])
    UDPClientSocket.close()
    return msg

def get_second_speedmsg():
    #request msg next 40km
    msgFromClient = "國5 N 55.0"
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
        s_15 = True  #0~15kmp
        s_55 = False #15~50kmp
        if(s_15):
            s_55 = True
           
            newmsg = get_first_speedmsg()

            newmsg = newmsg.replace("n","i")
            newmsg = newmsg.replace("t","j")
            newmsg = newmsg.replace("\i",",")
            newmsg = newmsg.replace("\j",":")
            first_fifteen = newmsg.split(',')   #first_forty store前40km data
            first_fifteen.pop()
            first_fifteen.pop(0)
            #print(first_fifteen)

            first_fifteen_d = my_dictionary();  #use dictionary to store kmp/speed
            for i in range(len(first_fifteen)):
                kmp1 = first_fifteen[i].split(':')
                first_fifteen_d.add(math.floor(float(kmp1[0])),kmp1[1])
            #print(first_fifteen_d)
        if(s_55):
            
            newmsg1 = get_second_speedmsg()

            newmsg1 = newmsg1.replace("n","i")
            newmsg1 = newmsg1.replace("t","j")
            newmsg1 = newmsg1.replace("\i",",")
            newmsg1 = newmsg1.replace("\j",":")
            second_55 = newmsg1.split(',')   #first_forty store前40km data
            second_55.pop()
            second_55.pop(0)

            second_55_d = my_dictionary();  #use dictionary to store kmp/speed
            for i in range(len(second_55)):
                kmp1 = second_55[i].split(':')
                second_55_d.add(math.floor(float(kmp1[0])),kmp1[1])
            #print(second_55_d)
        print("-----------json match------------")
        a = len(jf['segmentList'])
        for i in range(0,a):
            b = len(jf['segmentList'][i]['nodeList'])
            for j in range(0,b):
                #print((jf['segmentList'][i]['nodeList'][j][3]))
                ID = jf['segmentList'][i]['nodeList'][j][0]
                lat = jf['segmentList'][i]['nodeList'][j][1]
                log = jf['segmentList'][i]['nodeList'][j][2]
                kmp = math.floor(jf['segmentList'][i]['nodeList'][j][3])
                #print(type(kmp))
                if(kmp<=15):
                    for k,v in first_fifteen_d.items():
                        if (kmp == k):
                            realtimespeed = v
                            break;
                        else:
                            if(kmp > k):
                                realtimespeed = v
                                break;
                if(51>=kmp>15):
                    for k,v in second_55_d.items():
                        if(kmp == k):
                            realtimespeed = v
                            break;
                        else:
                            if(kmp>k):  #和國5S不一樣因為里程是由大到小
                                realtimespeed = v
                                break;
                if(kmp>51):
                    realtimespeed = list(second_55_d.values())[0]
                print(ID,lat,log,kmp,realtimespeed,datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                DAN.push ('Highway5N-TI', lat, log,"國五N_kmp"+str(kmp),realtimespeed, datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                time.sleep(0.5)
        print("-------------------------------------------------")
        first_fifteen_d.clear()
        second_55_d.clear()
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
