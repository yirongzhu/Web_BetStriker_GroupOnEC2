var arrCountries = [['Algeria', 615.8591179176698], ['Argentina', 997.6157928244118], ['Australia', 509.7160408178233], ['BH', 675.3454833873884], ['Belgium', 812.5012695978729], ['Brazil', 1153.8225067165602], ['Cameroon', 551.309284866234], ['Chile', 932.8452731539691], ['Colombia', 1067.2645321224213], ['CostaRica', 650.8546564673571], ['CotedIvoire', 714.3186706354867], ['Croatia', 818.2106846274572], ['Ecuador', 690.9090160195528], ['England', 897.5312151902181], ['France', 771.1066082519616], ['Germany', 1097.4636252047576], ['Ghana', 568.9453348666343], ['Greece', 966.5598200148164], ['Honduras', 666.7590139590759], ['Iran', 584.4655552724299], ['Italy', 969.2533631759236], ['Japan', 537.8585174989857], ['KoreaRepublic', 427.27390223922293], ['Mexico', 825.4615384614582], ['Netherlands', 872.2439983863969], ['Nigeria', 508.513672906088], ['Portugal', 993.4321189469161], ['Russia', 729.3345608962452], ['Spain', 1374.542209502313], ['Switzerland', 992.4194785313881], ['USA', 835.0391341267102], ['Uruguay', 1049.9748647093622]];

function CompareTwoTeams()
{
	var  Country1 = document.getElementById("country1").value;
	var  Country2 = document.getElementById("country2").value;
	var rank = arrCountries;
    var cr1, cr2;
    for(i=0;i<rank.length;i++)
    {
    	if (rank[i][0] == Country1)
            cr1 = rank[i][1];
        if (rank[i][0] == Country2)
            cr2 = rank[i][1];
    }

	var a = (100 * cr1 / (cr1 + cr2)).toFixed(2) + "%";
	var b = (100 * cr2 / (cr1 + cr2)).toFixed(2) + "%";
	document.getElementById("results").innerText = a;
	document.getElementById("results2").innerText = b;
}
