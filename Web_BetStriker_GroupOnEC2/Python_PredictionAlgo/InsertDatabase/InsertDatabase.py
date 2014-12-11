'''
Created on Apr 29, 2014

@author: Zhu Yirong
'''

def get_my_string(t, c1):
    text = open('C:/' + t, 'rU') 
    data = text.readlines()
    l = []
    for element in data:
        date = element[6:10] + '/' + element[3:5] + '/' + element[:2]
        i = element.find(':')
        k = i
        if element.find(c1) > i:
            while not element[i].isalpha():
                i -= 1
                j = i
                while element[j].isalpha():
                    j -= 1
            c2 = element[j + 1 : i + 1]
            s1 = element[k + 1:k + 2]
            s2 = element[k - 1:k]
        else:
            while not element[i].isalpha():
                i += 1
                j = i
                while element[j].isalpha():
                    j += 1
            c2 = element[i:j]
            s1 = element[k - 1:k]
            s2 = element[k + 1:k + 2]
        w = int(element[8:10]) / 104.
        result = "INSERT INTO CountryInfo (Country1, Playdate, Country2, Score1, Score2, Weight) VALUES(" + "'" + c1 + "'" + "," + "To_date(" + "'" + date + "'" + "," + "'yyyy/mm/dd')" + "," + "'" + c2 + "'" + "," + s1 + "," + s2 + "," + str(w) + ")" + ";"
        l.append(result)
    return l


def write_my_string(t1, t2, c1):
    l = get_my_string(t2, c1)
    text = open('C:/' + t1,'w')
    for element in l:
        text.write(element + '\n')



print write_my_string('Data Result0.txt','Data Sample0.txt','Brazil')
print write_my_string('Data Result1.txt','Data Sample1.txt','Croatia')
print write_my_string('Data Result2.txt','Data Sample2.txt','Mexico')
print write_my_string('Data Result3.txt','Data Sample3.txt','Cameroon')
print write_my_string('Data Result4.txt','Data Sample4.txt','Spain')
print write_my_string('Data Result5.txt','Data Sample5.txt','Netherlands')
print write_my_string('Data Result6.txt','Data Sample6.txt','Chile')
print write_my_string('Data Result7.txt','Data Sample7.txt','Australia')
print write_my_string('Data Result8.txt','Data Sample8.txt','Colombia')
print write_my_string('Data Result9.txt','Data Sample9.txt','Greece')
print write_my_string('Data Result10.txt','Data Sample10.txt','CotedIvoire')
print write_my_string('Data Result11.txt','Data Sample11.txt','Japan')
print write_my_string('Data Result12.txt','Data Sample12.txt','Uruguay')
print write_my_string('Data Result13.txt','Data Sample13.txt','CostaRica')
print write_my_string('Data Result14.txt','Data Sample14.txt','England')
print write_my_string('Data Result15.txt','Data Sample15.txt','Italy')
print write_my_string('Data Result16.txt','Data Sample16.txt','Switzerland')
print write_my_string('Data Result17.txt','Data Sample17.txt','Ecuador')
print write_my_string('Data Result18.txt','Data Sample18.txt','France')
print write_my_string('Data Result19.txt','Data Sample19.txt','Honduras')
print write_my_string('Data Result20.txt','Data Sample20.txt','Argentina')
print write_my_string('Data Result21.txt','Data Sample21.txt','BH')
print write_my_string('Data Result22.txt','Data Sample22.txt','Iran')
print write_my_string('Data Result23.txt','Data Sample23.txt','Nigeria')
print write_my_string('Data Result24.txt','Data Sample24.txt','Germany')
print write_my_string('Data Result25.txt','Data Sample25.txt','Portugal')
print write_my_string('Data Result26.txt','Data Sample26.txt','Ghana')
print write_my_string('Data Result27.txt','Data Sample27.txt','USA')
print write_my_string('Data Result28.txt','Data Sample28.txt','Belgium')
print write_my_string('Data Result29.txt','Data Sample29.txt','Algeria')
print write_my_string('Data Result30.txt','Data Sample30.txt','Russia')
