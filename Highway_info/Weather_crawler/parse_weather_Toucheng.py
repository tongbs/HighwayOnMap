# -*- coding: utf-8 -*-
import time
from bs4 import BeautifulSoup
from io import open
import requests

def parse_weather():
	def get_element(soup, tag, class_name):
		data = []
		table = soup.find(tag, attrs={'class':class_name})
		rows = table.find_all('tr')
		del rows[0]
		
		for row in rows:
			first_col = row.find_all('th')
			cols = row.find_all('td')
			cols.insert(0, first_col[0])
			cols = [ele.text.strip() for ele in cols]
			data.append([ele for ele in cols if ele]) 
		return data

	region ='Hsinchu'

	url = 'https://www.cwb.gov.tw/V7/observe/24real/Data/C0U86.htm'

	def f(url, fn):
		headers = {
		 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36'
		}
		res = requests.get(url, headers=headers)
		res.encoding = 'utf-8'
		return res.text

		#open(fn,'wb').write(res.text.encode('utf-8'))

	fn = region+ '.html'.format(0,0)
	s=f(url, fn)
	   
	#file_name = region+".html"

	#f = open (file_name,'r', encoding='utf-8')
	#s = f.readlines()
	s = ''.join(s)

	soup = BeautifulSoup(s, "lxml")

	df_tmp = get_element(soup, 'table','BoxTable')

	return (df_tmp[0][10])

#print(df_tmp)


#########################################################################################
#import pandas as pd
#print ('Region :', region,'Building table ...')
#col_list = ['觀測時間', '溫度(°C)', '溫度(°F)', '天氣', '風向', '風力 (m/s)|(級)', '陣風 (m/s)|(級)', '能見度(公里)', '相對溼度(%)', '海平面氣壓(百帕)', '當日累積雨量(毫米)', '日照時數(小時)']
#df = pd.DataFrame(columns = col_list)
#df_tmp = pd.DataFrame(df_tmp)
#df_tmp.columns = col_list
#df = pd.concat([df, df_tmp], axis=0)   
#df = df.reset_index(drop=True)    
#df.to_csv(( region + '.csv'), encoding = 'utf-8')



