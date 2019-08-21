import time, DAN, requests, random
import parse_weather_Luodong,parse_weather_Pinglin,parse_weather_Shiding,parse_weather_Suao,parse_weather_Toucheng,parse_weather_Yilan

ServerURL = 'http://140.113.199.188:9999' #with no secure connection
#ServerURL = 'https://DomainName' #with SSL connection
Reg_addr = 'weather05' #if None, Reg_addr = MAC address

DAN.profile['dm_name']='highway_weather'
DAN.profile['df_list']=['Luodong', 'Pinglin','Shihding','Suao','Toucheng','Yilan']
DAN.profile['d_name']= 'weather05' # None for autoNaming
DAN.device_registration_with_retry(ServerURL, Reg_addr)

loc_L_x=24.671768; loc_L_y=121.795677
loc_P_x=24.892458; loc_P_y=121.759657
loc_Sh_x=24.973393; loc_Sh_y=121.679585
loc_Su_x=24.620380; loc_Su_y=121.821954
loc_T_x=24.838840; loc_T_y=121.789835
loc_Y_x=24.754065; loc_Y_y=121.778854


change_L=0;change_P=0;
change_Sh=0;change_Su=0;
change_T=0;change_Y=0;
cnt=1

flag_L_p=0;flag_P_p=0;
flag_Sh_p=0;flag_Su_p=0;
flag_T_p=0;flag_Y_p=0;

'''
DAN.deregister()
exit()
'''
time.sleep(10)
while True:
    try:

        
        w_L=parse_weather_Luodong.parse_weather()
        w_P=parse_weather_Pinglin.parse_weather()   
        #w_Sh=parse_weather_Shiding.parse_weather()  #error
        w_Sh='60'
        w_Su=parse_weather_Suao.parse_weather()
        w_T=parse_weather_Toucheng.parse_weather()
        w_Y=parse_weather_Yilan.parse_weather()
        #w_Y='70'

        
        
        if(float(w_L) > 50):
            flag_L=0
            msg_L='羅東大雨 , 注意行車'
            if(flag_L!=flag_L_p): change_L=1
            else : change_L=0
        else:
            flag_L=1
            msg_L='羅東天氣晴朗 , 安心行車'
            if(flag_L!=flag_L_p): change_L=1
            else : change_L=0
        
        if(float(w_P) > 50):
            flag_P=0
            msg_P='坪林大雨 , 注意行車'
            if(flag_P!=flag_P_p): change_P=1
            else : change_P=0
        else:
            flag_P=1
            msg_P='坪林天氣晴朗 , 安心行車'
            if(flag_P!=flag_P_p): change_P=1
            else : change_P=0
            
        if(float(w_Sh) > 50):
            flag_Sh=0
            msg_Sh='石碇大雨 , 注意行車'
            if(flag_Sh!=flag_Sh_p): change_Sh=1
            else : change_Sh=0
        else:
            flag_Sh=1
            msg_Sh='石碇天氣晴朗 , 安心行車'
            if(flag_Sh!=flag_Sh_p): change_Sh=1
            else : change_Sh=0

        if(float(w_T) > 50):
            flag_T=0
            msg_T='頭城大雨 , 注意行車'
            if(flag_T!=flag_T_p): change_T=1
            else : change_T=0
        else:
            flag_T=1
            msg_T='頭城天氣晴朗 , 安心行車'
            if(flag_T!=flag_T_p): change_T=1
            else : change_T=0

        if(float(w_Su) > 50):
            flag_Su=0
            msg_Su='蘇澳大雨 , 注意行車'
            if(flag_Su!=flag_Su_p): change_Su=1
            else : change_Su=0
        else:
            flag_Su=1
            msg_Su='蘇澳天氣晴朗 , 安心行車'
            if(flag_Su!=flag_Su_p): change_Su=1
            else : change_Su=0

        if(float(w_Y) > 50):
            flag_Y=0
            msg_Y='宜蘭市區大雨 , 注意行車'
            if(flag_Y!=flag_Y_p): change_Y=1
            else : change_Y=0
        else:
            flag_Y=1
            msg_Y='宜蘭市區天氣晴朗 , 安心行車'
            if(flag_Y!=flag_Y_p): change_Y=1
            else : change_Y=0

        flag_L_p=flag_L;flag_P_p=flag_P;
        flag_Sh_p=flag_Sh;flag_Su_p=flag_Su;
        flag_T_p=flag_T;flag_Y_p=flag_Y;
        
        
                 

        uid_L='羅東'; uid_P='坪林'
        uid_Sh='石碇'; uid_Su='蘇澳'
        uid_T='頭城'; uid_Y='宜蘭'

    
        
        
        if(cnt==1 or change_L==1):
            print('1')
            DAN.push('Luodong',loc_L_x,loc_L_y,uid_L,flag_L,msg_L)
        time.sleep(1)
        
        if(cnt==1 or change_P==1):
            print('2')
            DAN.push('Pinglin',loc_P_x,loc_P_y,uid_P,flag_P,msg_P)

        time.sleep(1)
        
        if(cnt==1 or change_Sh==1):
            print('3')
            DAN.push('Shihding',loc_Sh_x,loc_Sh_y,uid_Sh,flag_Sh,msg_Sh)
        time.sleep(1)
        
        if(cnt==1 or change_Su==1):
            print('4')
            DAN.push('Suao',loc_Su_x,loc_Su_y,uid_Su,flag_Su,msg_Su)
        time.sleep(1)
        
        if(cnt==1 or change_T==1):
            print('5')
            DAN.push('Toucheng',loc_T_x,loc_T_y,uid_T,flag_T,msg_T)
        time.sleep(1)

        if(cnt==1 or change_Y==1):
            print('6')
            DAN.push('Yilan',loc_Y_x,loc_Y_y,uid_Y,flag_Y,msg_Y)
        time.sleep(1)
        
        print('AAAA')
        cnt=cnt+1
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

