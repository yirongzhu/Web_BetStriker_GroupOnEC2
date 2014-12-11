'''
Created on May 3, 2014

@author: Administrator
'''

import cx_Oracle
import numpy
import numpy.linalg
from numpy import matrix
from numpy.linalg import matrix_rank


con = cx_Oracle.connect('zhuyirong', 'DB123', cx_Oracle.makedsn('localhost', '1521', 'SOCCER'))

def Get_Y_Matrix(c):
    Y = []
    cur = c.cursor()
    cur.execute("Select avg((score1 - score2) * weight) From countryinfo Group by country1, country2 Order by country1")
    fetch = cur.fetchall()
    for result in fetch:
        Y.append(float(result[0]))
    return Y

def Get_Country_Matrix(c):
    Country = []
    cur = c.cursor()
    cur.execute("Select country1, country2, avg((score1 - score2) * weight) From countryinfo Group by country1, country2 Order by country1")
    fetch = cur.fetchall()
    for result in fetch:
        Country.append([[result[0], result[1]], float(result[2])])
    return Country

def Get_X_Matrix(c):
    Country = Get_Country_Matrix(c)
    X = []
    c = ['Brazil','Croatia','Mexico','Cameroon','Spain','Netherlands','Chile','Australia','Colombia','Greece','CotedIvoire','Japan','Uruguay','CostaRica','England','Italy','Switzerland','Ecuador','France','Honduras','Argentina','BH','Iran','Nigeria','Germany','Portugal','Ghana','USA','Belgium','Algeria','Russia','KoreaRepublic']
    c.sort()
    for element in Country:
        component = []
        for i in range(0, 32):
            component.append(0)
        if element[1] == 0:
            country1 = c.index(element[0][0])
            country2 = c.index(element[0][1])
            component[country1] = 0
            component[country2] = 0
        elif element[1] > 0:
            country1 = c.index(element[0][0])
            country2 = c.index(element[0][1])
            component[country1] = 1
            component[country2] = -1
        else:
            country1 = c.index(element[0][0])
            country2 = c.index(element[0][1])
            component[country1] = -1
            component[country2] = 1
        X.append(component)
    return X




def Regression_Calculation():
    Y = matrix( Get_Y_Matrix(con), dtype = float )
    X = matrix( Get_X_Matrix(con), dtype = float )
    if matrix_rank(X) == 32:
        return (X.T * X).I * X.T * Y.T
    else:
        return numpy.linalg.pinv(X) * Y.T

    
def Final_Rank():
    h_rank = Regression_Calculation()
    h_list = numpy.array(h_rank).tolist()
    Fifa_rank = [['Algeria',795.], ['Argentina',1174.], ['Australia',545.], ['BH',795.], ['Belgium',1039.], ['Brazil',1174.], ['Cameroon',583.], ['Chile',1011.], ['Colombia',1186.], ['CostaRica',746.], ['CotedIvoire',830.], ['Croatia',871.], ['Ecuador',790.], ['England',1043.], ['France',935.], ['Germany',1340.], ['Ghana',713.], ['Greece',1082.], ['Honduras',757.], ['Iran',715.], ['Italy',1115.], ['Japan',613.], ['KoreaRepublic',551.], ['Mexico',876.], ['Netherlands',967.], ['Nigeria',626.], ['Portugal',1245.], ['Russia',903.], ['Spain',1460.], ['Switzerland',1161.], ['USA',1015.], ['Uruguay',1181.]]
    R_rank = []
    for r in h_list:
        R_rank.append(r[0])
    for i in range(0, 32):
        Fifa_rank[i][1] += Fifa_rank[i][1] * R_rank[i]
    return Fifa_rank



def Compare_Two_Teams(Country1, Country2):
    rank = Final_Rank()
    cr1 = 0.
    cr2 = 0.
    for e in rank:
        if e[0] == Country1:
            cr1 = e[1]
        if e[0] == Country2:
            cr2 = e[1]
    print Country1 +": " + "%.2f%%" % (100 * cr1 / (cr1 + cr2)) + "    " + Country2 +": " + "%.2f%%" % (100 * cr2 / (cr1 + cr2))




print Compare_Two_Teams('Brazil', 'Argentina')


