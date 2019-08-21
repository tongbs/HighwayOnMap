import time, DAN, requests, random , json , math
import socket,re
from datetime import datetime

ServerURL = 'https://test.iottalk.tw' #with no secure connection
#ServerURL = 'https://DomainName' #with SSL connection
Reg_addr = 'highwayfiveN' #if None, Reg_addr = MAC address

DAN.profile['dm_name']='highway5N'
DAN.profile['df_list']=['highway5Ndata']
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

with open('fixed_5N_location.json','r') as reader:
    jf = json.loads(reader.read())

def get_speedmsg(req_msg):
    tmp_msg = req_msg  #如果封包遺失的話可以藉由tmp_msg重新request
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
        UDPClientSocket.close()
        print("Speed msg UDP package lost")
        get_speedmsg(tmp_msg)
    msg = "{} ".format(msgFromServer[0])
    UDPClientSocket.close() 
    return msg

while True:
    try:
        speedmsg_15 = True  #國五北上0~15km的車速資料
        speedmsg_55 = False #國五北上15~50km的車速資料
        if(speedmsg_15):
            speedmsg_55 = True
            newmsg = get_speedmsg("國5 N 15.0")
            newmsg = newmsg.replace("n","i")    #以下進行資料處理
            newmsg = newmsg.replace("t","j")
            newmsg = newmsg.replace("\i",",")
            newmsg = newmsg.replace("\j",":")
            first_fifteen = newmsg.split(',')             #first_fifteen store 0~15km data
            #print(first_fifteen)
            first_fifteen.pop()
            first_fifteen.pop(0)
            #print(first_fifteen)
            first_fifteen_d = my_dictionary();         #use dictionary to store kmp/speed
            for i in range(len(first_fifteen)):
                kmp1 = first_fifteen[i].split(':')
                first_fifteen_d.add(math.floor(float(kmp1[0])),kmp1[1])
            #print(first_fifteen_d)
        if(speedmsg_55):
            newmsg1 = get_speedmsg("國5 N 55.0")
            newmsg1 = newmsg1.replace("n","i")    #以下進行資料處理
            newmsg1 = newmsg1.replace("t","j")
            newmsg1 = newmsg1.replace("\i",",")
            newmsg1 = newmsg1.replace("\j",":")
            second_55 = newmsg1.split(',')                #second_55 store 15~50km data
            second_55.pop()
            second_55.pop(0)
            second_55_d = my_dictionary();               #use dictionary to store kmp/speed
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
                DAN.push ('highway5Ndata', lat, log,"國五北上 "+str(kmp)+" km",realtimespeed, datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                time.sleep(0.1)
        print("-------------------------------------------------")
        first_fifteen_d.clear()
        second_55_d.clear()
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
