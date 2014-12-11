var vevoEmbed = {

	freewheelRequestTimeout: false,
	adDataRequested: false,
	preRollPlaying: false,
	hasPreRoll: false,
	sbId: "",
	playerContainer: {},
	videoPlayer: {},
	preRollSlots: [],
	authData: {},
	adContext: {},
	currentPrerollSlot: {},
	onPrerollTimerID: 0,
	playerSWFDivID: "",
	playerSWFObjectID: "",
	isrc: "",
	siteSection: "",
	containerHTML5: {},
	playerHTML5: {},
	width: 0,
	height: 0,
	ytID: "",
	secureHost: false,
	streamSense: {},

	embedVevoVideo: function (isrc, siteSection, sbId, playerContainer, videoPlayer) {

		vevoEmbed.intializeStreamSense();
		vevoEmbed.secureHost = location.protocol == "https:";

		if (vevoEmbed.preRollPlaying) {
			clearInterval(vevoEmbed.onPrerollTimerID);
		}

		//Reset Ad Objects
		vevoEmbed.preRollSlots = [];
		vevoEmbed.hasPreRoll = false;
		vevoEmbed.preRollPlaying = false;
		vevoEmbed.sbId = sbId;

		vevoEmbed.playerContainer = playerContainer;
		vevoEmbed.videoPlayer = videoPlayer;

		Conviva.LivePass.init("https://livepass.conviva.com", "c3.Vevo", vevoEmbed.livePassNotifier);
		Conviva.LivePass.toggleTraces(false); // or true for testing



		vevoEmbed.authenticateVideo(isrc, window.location.hostname, sbId, function (authData) {

			if (!authData.isApproved) {
				vevoEmbed.playerContainer.html("<p>" + authData.statusMessage + "</p><p>" + authData.statusDetails + "</p>");
			} else {

				//Set logo bug
				var bugImg = vevoEmbed.secureHost ? "https://scache.vevo.com/m/img/logo/vevo_logo_white.png" : "http://cache.vevo.com/m/img/logo/vevo_logo_white.png";
				$('#imageBug').attr("src", bugImg);

				//set poster image to fill
				var width = vevoEmbed.playerContainer.width();
				var img = authData.video.imageUrl + "?width=" + width;

				if (vevoEmbed.secureHost) {
					authData.video.imageUrl = authData.video.imageUrl.replace("http://stg-cache.vevo.com", "https://stg-scache.vevo.com").replace("http://cache.vevo.com", "https://scache.vevo.com");
				}

				vevoEmbed.videoPlayer.attr("poster", img);

				//load video source and freewheel ad
				vevoEmbed.authData = authData;
				//Properly parse xml
				//vevoEmbed.videoPlayer[0].src = vevoEmbed.createLevel3HTML5VideoLink(authData.video.isrc);
				vevoEmbed.videoPlayer[0].src = vevoEmbed.getSourceURL(authData);
				vevoEmbed.videoPlayer[0].load();

				$(document).on("Vevo.Ad.PrerollStart", vevoEmbed.onAdPrerollStart);

				if (authData.video.isMonetizable) {//Check to see if ad can be played
					vevoEmbed.initFreewheel(videoPlayer, siteSection, authData, function (success) {
						vevoEmbed.videoPlayer.css("display", "block"); //must display player or playback won't begin on some devices

						if (success && vevoEmbed.preRollSlots && vevoEmbed.preRollSlots[0]) {
							vevoEmbed.hasPreRoll = true;
						} else {
							vevoEmbed.hasPreRoll = false;
						}

						vevoEmbed.videoPlayer.on('play', vevoEmbed.onInitialPlay);
						//Add Controls
						vevoEmbed.videoPlayer.attr("controls", "controls");

					});
				}
				else {
					vevoEmbed.hasPreRoll = false;
					vevoEmbed.videoPlayer.on('play', vevoEmbed.onInitialPlay);
					//Add Controls
					vevoEmbed.videoPlayer.attr("controls", "controls");
				}
			}
		});

	},

	onAdPrerollStart: function () {
		$(document).off("Vevo.Ad.PrerollStart", vevoEmbed.onAdPrerollStart);

		vevoEmbed.setStreamSenseClip(vevoEmbed.authData,true);
		vevoEmbed.streamSense.notify(ns_.StreamSense.PlayerEvents.PLAY, {}, 0);

		$(document).on("Vevo.Ad.PrerollComplete", vevoEmbed.onAdPrerollComplete);
	},

	onAdPrerollComplete: function(){
		$(document).off("Vevo.Ad.PrerollComplete", vevoEmbed.onAdPrerollComplete);
		vevoEmbed.streamSense.notify(ns_.StreamSense.PlayerEvents.END, {}, vevoEmbed.currentPrerollSlot.getTotalDuration());
	},

	onInitialPlay: function () {
		vevoEmbed.videoPlayer.off('play', vevoEmbed.onInitialPlay);
		vevoEmbed.videoPlayer[0].pause();

		if (vevoEmbed.hasPreRoll) {
			vevoEmbed.videoPlayer.removeAttr("controls");
			vevoEmbed.playPreRoll();
		} else {
			//Send AdOpportunity Complete 
			$(document).trigger({ type: "Vevo.AdOpportunity.Complete" });

			setTimeout(vevoEmbed.startContentPlayback, 1000);
		}
	},

	embedHTML5Video: function (isrc, siteSection, sbId, playerContainer, videoPlayer) {
		vevoEmbed.embedVevoVideo(isrc, siteSection, sbId, playerContainer, videoPlayer);
	},

	checkCountrySuccessCallback: function () {
		if (swfobject.hasFlashPlayerVersion("10.1.53")) {
			vevoEmbed.containerHTML5.hide();
			vevoEmbed.embedSWF(vevoEmbed.isrc, vevoEmbed.siteSection, vevoEmbed.sbId, vevoEmbed.playerSWFDivID, vevoEmbed.playerSWFObjectID, vevoEmbed.width, vevoEmbed.height);
		} else {
			$("#" + vevoEmbed.playerSWFDivID).hide();
			vevoEmbed.embedHTML5Video(vevoEmbed.isrc, vevoEmbed.siteSection, vevoEmbed.sbId, vevoEmbed.containerHTML5, vevoEmbed.playerHTML5);
		}
	},

	checkCountryFailCallback: function (id) {
		var url = "//www.youtube.com/embed/" + id + "?rel=0";
		window.location.replace(url);
	},

	getIDByVersionAndSourceType: function (versionToGet, sourceTypeToGet) {
		var idToReturn = "";
		$(vevoEmbed.authData.video.videoVersions).each(function (index, videoVersion) {
			if (videoVersion.version == versionToGet && videoVersion.sourceType == sourceTypeToGet) {
				idToReturn = videoVersion.id;
			}
		});

		return idToReturn;
	},

	checkCountry: function (callbackSuccess, callbackFail) {
		//Need to figure out how to do this efficiently, using param proxy for now.
		var doFailover = vevoEmbed.getParameterByName("forceYTFailover") == "1";
		vevoEmbed.ytID = "";

		vevoEmbed.authenticateVideo(vevoEmbed.isrc, window.location.hostname, vevoEmbed.sbId, function (authdata) {
			vevoEmbed.authData = authdata;
			//Call appropriate callback for Failover
			if (authdata.statusCode == 502 || doFailover) {
				var id = authdata.isApproved ? vevoEmbed.getIDByVersionAndSourceType(0, 0) : authdata.errorInfo.ytid;
				callbackFail(id);
			} else {
				callbackSuccess();
			}
		});
	},
	embedDynamicVideo: function (isrc, siteSection, sbId, containerHTML5, playerHTML5, playerSWFDivID, playerSWFObjectID, width, height) {
		//Store values for callback.
		vevoEmbed.playerSWFDivID = playerSWFDivID;
		vevoEmbed.playerSWFObjectID = playerSWFObjectID;
		vevoEmbed.isrc = isrc;
		vevoEmbed.siteSection = siteSection;
		vevoEmbed.sbId = sbId;
		vevoEmbed.containerHTML5 = containerHTML5;
		vevoEmbed.playerHTML5 = playerHTML5;
		vevoEmbed.width = width;
		vevoEmbed.height = height;
		vevoEmbed.secureHost = location.protocol == "https:" || vevoEmbed.getParameterByName("secureOverride") == "1";

		vevoEmbed.checkCountry(vevoEmbed.checkCountrySuccessCallback, vevoEmbed.checkCountryFailCallback);



	},

	embedSWF: function (isrc, siteSection, sbId, playerDivID, playerObjectID, width, height) {

		vevoEmbed.secureHost = location.protocol == "https:" || vevoEmbed.getParameterByName("secureOverride") == "1";

		var video = isrc;
		var playlist = false;
		var autoplay = vevoEmbed.getParameterByName("autoplay") || "0";
		var playerType = vevoEmbed.getParameterByName("playerType") || "embedded";
		var cultureName = vevoEmbed.getParameterByName("cultureName") || "en_us";
		var cultureIsRTL = vevoEmbed.getParameterByName("cultureIsRTL") || "False";
		var embed = vevoEmbed.getParameterByName("embed");
		var sbId = vevoEmbed.getParameterByName("sbId") || "C188A3CA-3593-453A-B995-394B7A7E5332";
		var siteSection = vevoEmbed.getParameterByName("siteSection") || "vevo_player_embedded";
		var enableShare = vevoEmbed.getParameterByName("enableShare") || "true";


		var environment = vevoEmbed.getParameterByName("branch");
		var baseurl = "";
		switch (environment) {
			case 'local': baseurl = "http://localhost:3086"; break;
			case 'staging':
				vevoEmbed.secureHost ? baseurl = "https://stg-svideoplayer.vevo.com" : baseurl = "http://stg-videoplayer.vevo.com";
				break;
			default:
				vevoEmbed.secureHost ? baseurl = "https://svideoplayer.vevo.com" : baseurl = "http://videoplayer.vevo.com";
				break;
		}

		swfobject.embedSWF(baseurl + "/embed/embedded", playerDivID, width, height, "10.1.53", false, { /*flashvars*/
			'playerType': playerType,
			'videoId': video,
			'playlist': playlist,
			'enableDomScan': 'false',
			'siteSection': siteSection,
			'autoplay': autoplay,
			'cc': "US",
			'cultureName': cultureName,
			'cultureIsRTL': cultureIsRTL,
			'embed': embed,
			'endScreen': 'play',
			'sbId': sbId,
			'enableShare': enableShare
		}, { /*params*/
			bgcolor: "#000000",
			allowFullScreen: "true",
			allowScriptAccess: "always",
			wmode: "transparent"
		}, { /*attributes*/
			id: playerObjectID
		});
	},

	playPreRoll: function () {
		vevoEmbed.preRollSlots[0].play();
		vevoEmbed.preRollPlaying = true;
	},

	startContentPlayback: function () {

		if (vevoEmbed.hasPreRoll) {
			clearInterval(vevoEmbed.onPrerollTimerID);
		}
		vevoEmbed.preRollPlaying = false;
		vevoEmbed.beginTracking();
		vevoEmbed.setStreamSenseClip(vevoEmbed.authData,false);
		vevoEmbed.videoPlayer.on("play", vevoEmbed.onContentVideoPlay);
		vevoEmbed.videoPlayer.on("pause", vevoEmbed.onContentVideoPause);
		vevoEmbed.videoPlayer.on('ended', vevoEmbed.onContentVideoEnded);
		vevoEmbed.videoPlayer.on('waiting', vevoEmbed.onContentVideoBuffering);
		vevoEmbed.videoPlayer.on('seeking', vevoEmbed.onContentVideoPause);
		vevoEmbed.videoPlayer.on('timeupdate', vevoEmbed.onContentVideoTimeUpdated);
		vevoEmbed.videoPlayer.attr("controls", "controls");
		vevoEmbed.videoPlayer[0].play();
		vevoEmbed.adContext.setVideoState(tv.freewheel.SDK.VIDEO_STATE_PLAYING);

	},

	livePassNotifier: function (convivaNotification) {

		//Don't really need to do anything here.
		if (convivaNotification.code == 0) {
			//Conviva livepass initialized
		} else {
			if (Conviva.LivePass.ready) { // check if LivePass is already initialized
				//Vevo.Helper.Console.Log("Conviva LivePass post-initialization feedback.\n " +
				//"\tCode: " + convivaNotification.code + ";\n " +
				//"\tMessage: " + convivaNotification.message);
			} else {
				//Vevo.Helper.Console.Log("Conviva LivePass failed to initialize!\n " +
				// "t\Conviva metrics will not be captured! " +
				//"\tCode: " + convivaNotification.code + "; " +
				// "\tMessage: " + convivaNotification.message);
			}
		}
	},

	createLevel3HTML5VideoLink: function (isrc) {
		var source = "http://prog.lvl3.strm.vevo.com/Video/V2/H264/" + isrc.toString().toUpperCase() + "/" + isrc.toString().toLowerCase() + "_high_480x360_x264_608_quicktime_192.mp4";
		return source;
	},

	initFreewheel: function (player, siteSection, authData, callback) {

		var contentVideoURL = player[0].src;
		var theNetworkId = 40185;
		var theServerURL = "https://9cf9.v.fwmrm.net/ad/g/1";
		var theDisplayBaseId = "playerHTML5";
		var theProfileId = "vevo_HTML5_prod";
		var theVideoAssetId = authData.video.isrc;
		var theVideoDuration = authData.video.duration;


		vevoEmbed.videoPlayer.off("play", vevoEmbed.onContentVideoPlay);
		vevoEmbed.videoPlayer.off("pause", vevoEmbed.onContentVideoPause);
		vevoEmbed.videoPlayer.off('waiting', vevoEmbed.onContentVideoBuffering);
		vevoEmbed.videoPlayer.off('seeking', vevoEmbed.onContentVideoPause);
		vevoEmbed.videoPlayer.off('timeupdate', vevoEmbed.onContentVideoTimeUpdated);
		vevoEmbed.videoPlayer.off('ended', vevoEmbed.onContentVideoEnded);

		if (typeof tv == 'undefined') {
			//Freewheel not found
			callback(false);
			return;
		}

		var theAdManager = new tv.freewheel.SDK.AdManager();
		theAdManager.setNetwork(theNetworkId);
		theAdManager.setServer(theServerURL);

		var theAdContext = theAdManager.newContext();
		theAdContext.registerVideoDisplayBase(theDisplayBaseId);
		theAdContext.setProfile(theProfileId);
		theAdContext.setVideoAsset(theVideoAssetId, theVideoDuration, theNetworkId);
		theAdContext.setSiteSection(siteSection, theNetworkId);

		vevoEmbed.adContext = theAdContext;
		//Add key-values for ad targeting.
		//theAdContext.addKeyValue("module", "DemoPlayer");
		//theAdContext.addKeyValue("feature", "trackingURLs");
		//theAdContext.addKeyValue("feature", "simpleAds");

		//Listen to AdManager Events
		vevoEmbed.freewheelInitCallback = callback;
		vevoEmbed.videoPlayer = player;
		vevoEmbed.authData = authData;

		theAdContext.addEventListener(tv.freewheel.SDK.EVENT_REQUEST_COMPLETE, vevoEmbed.onAdRequestComplete);
		theAdContext.addEventListener(tv.freewheel.SDK.EVENT_SLOT_ENDED, vevoEmbed.onSlotEnded);
		theAdContext.addEventListener(tv.freewheel.SDK.EVENT_SLOT_STARTED, vevoEmbed.onSlotStarted);

		//To make sure video ad playback in poor network condition, set video ad timeout parameters.
		vevoEmbed.adContext.setParameter(tv.freewheel.SDK.PARAMETER_RENDERER_VIDEO_START_DETECT_TIMEOUT, 10000, tv.freewheel.SDK.PARAMETER_LEVEL_GLOBAL);
		vevoEmbed.adContext.setParameter(tv.freewheel.SDK.PARAMETER_RENDERER_VIDEO_PROGRESS_DETECT_TIMEOUT, 10000, tv.freewheel.SDK.PARAMETER_LEVEL_GLOBAL);

		//Add 1 preroll, 1 midroll, 2 overlay, 1 postroll slot
		vevoEmbed.adContext.addTemporalSlot("Preroll_1", tv.freewheel.SDK.ADUNIT_PREROLL, 0);
		//this.theAdContext.addTemporalSlot("Midroll_1", tv.freewheel.SDK.ADUNIT_MIDROLL, 5);
		//this.theAdContext.addTemporalSlot("Overlay_1", tv.freewheel.SDK.ADUNIT_OVERLAY, 10);
		//this.theAdContext.addTemporalSlot("Overlay_2", tv.freewheel.SDK.ADUNIT_OVERLAY, 15);
		//this.theAdContext.addTemporalSlot("Postroll_1", tv.freewheel.SDK.ADUNIT_POSTROLL, 60);


		//Send AdOpportunity Start 
		$(document).trigger({ type: "Vevo.AdOpportunity.Start" });

		vevoEmbed.preRollPlaying = false;
		vevoEmbed.freewheelRequestTimeout = false;
		vevoEmbed.loadAdData();
		setTimeout(vevoEmbed.handleRequestTimeout, 15000); //don't prevent user from playing video if ad call fails
	},

	loadAdData: function () {
		vevoEmbed.adContext.submitRequest();
		vevoEmbed.adDataRequested = true;
	},

	handleRequestTimeout: function () {
		if (!vevoEmbed.freewheelRequestTimeout) {
			vevoEmbed.freewheelInitCallback(false);
		}
		vevoEmbed.freewheelRequestTimeout = true;
	},

	onAdRequestComplete: function (event) {


		if (vevoEmbed.freewheelRequestTimeout) {
			return;
		}

		vevoEmbed.freewheelRequestTimeout = true;

		if (event.success) {
			var fwTemporalSlots = vevoEmbed.adContext.getTemporalSlots();
			for (var i = 0; i < fwTemporalSlots.length; i++) {
				var slot = fwTemporalSlots[i];
				switch (slot.getTimePositionClass()) {
					case tv.freewheel.SDK.TIME_POSITION_CLASS_PREROLL:
						vevoEmbed.preRollSlots.push(slot);
						break;
					case tv.freewheel.SDK.TIME_POSITION_CLASS_MIDROLL:
					case tv.freewheel.SDK.TIME_POSITION_CLASS_OVERLAY:
					case tv.freewheel.SDK.TIME_POSITION_CLASS_POSTROLL:
						break; // There are only preRolls now
				}
			}
		}

		vevoEmbed.freewheelInitCallback(true);
	},

	beginTracking: function () {

		var host = document.location.hostname;
		vevoEmbed.beginSessionMonitoring();
		vevoEmbed.trackSuperBeacon(vevoEmbed.sbId, vevoEmbed.authData.video.isrc, "0", host, host, "US");
	},

	trackSuperBeacon: function (sourceId, videoId, userId, domain, referrer, region) {
		var sbURL = vevoEmbed.secureHost ? "https://sb.vevo.com/Player/PlayStart.ashx" : "http://sb.vevo.com/Player/PlayStart.ashx";
		$.ajax(
					sbURL,
					{ data: { sourceId: sourceId, videoId: videoId, userId: userId, domain: domain, referrer: referrer, region: region} }
				);
	},

	beginSessionMonitoring: function () {
		if (typeof Conviva !== "undefined" && Conviva) {
			var isrc = vevoEmbed.authData.video.isrc;
			var artistSafeName = vevoEmbed.authData.video.urlSafeArtistName;
			var title = vevoEmbed.authData.video.urlSafetitle;
			var assetName = isrc + " - " + artistSafeName + " - " + title;
			var url = vevoEmbed.createLevel3HTML5VideoLink(isrc);
			var na = "N/A";
			var video = vevoEmbed.authData.video;
			var convivaMetadata = Conviva.ConvivaContentInfo.createInfoForLightSession(assetName);


			var mainArtists = na;
			if (video.mainArtists && video.mainArtists != undefined && video.mainArtists.length > 0) { mainArtists = vevoEmbed.getGrouping(video.mainArtists, "artistName") };

			var featuredArtists = na;
			if (video.featuredArtists && video.featuredArtists != undefined && video.featuredArtists.length > 0) { featuredArtists = vevoEmbed.getGrouping(video.featuredArtists, "artistName") };


			convivaMetadata.streamUrl = url;
			convivaMetadata.isLive = false;
			convivaMetadata.cdnName = "LEVEL3";
			convivaMetadata.playerName = "HTML5 Mobile";
			convivaMetadata.deviceType = Conviva.ConvivaContentInfo.DEVICE_TYPE_MOBILE;
			convivaMetadata.tags = {
				isrc: isrc,
				albumId: video.albumId || na,
				albumName: video.albumName || na,
				contentDuration: video.duration,
				composer: video.composer || na,
				director: video.director || na,
				genre: video.genres.join(),
				featuredArtists: featuredArtists,
				isExplicit: video.isExplicit,
				isMonetizable: video.isMonetizable,
				isPremiere: video.isPremiere,
				mainArtists: mainArtists,
				pageUrl: video.deepLinkUrl,
				recordLabel: video.recordLabel || na,
				shortUrlId: video.shortUrlId,
				releaseDate: video.releaseDate,
				title: video.title || na,
				urlSafetitle: video.urlSafetitle,
				urlSafeArtistName: video.urlSafeArtistName,
				domain: window.location.hostname
			};

			var streamer = vevoEmbed.videoPlayer[0];
			streamer.onended = vevoEmbed.endSessionMonitoring;
			var session = Conviva.LivePass.createSession(streamer, convivaMetadata);
			if (session && typeof (session) !== "undefined") { session.setContentLength(video.duration); }
		}
	},

	endSessionMonitoring: function () {
		if (typeof Conviva !== "undefined" && Conviva) {
			var streamer = vevoEmbed.videoPlayer[0];
			Conviva.LivePass.cleanupMonitoringSession(streamer);
		}
	},

	getGrouping: function (a, p) { //Just pulls an object out into an array then joins them.
		var r = [];

		for (var i = 0; i < a.length; i++) {
			r.push(a[i][p]);
		}

		return r.join();
	},

	onSlotStarted: function (event) {
		var slotTimePositionClass = event.slot.getTimePositionClass();
		switch (slotTimePositionClass) {
			case tv.freewheel.SDK.TIME_POSITION_CLASS_PREROLL:

				//Trigger Preroll Start Event
				$(document).trigger({ type: "Vevo.Ad.PrerollStart" });

				vevoEmbed.currentPrerollSlot = event.slot;
				vevoEmbed.onPrerollTimerID = setInterval(vevoEmbed.onPrerollTimer, 250);
			case tv.freewheel.SDK.TIME_POSITION_CLASS_MIDROLL:
			case tv.freewheel.SDK.TIME_POSITION_CLASS_OVERLAY:
			case tv.freewheel.SDK.TIME_POSITION_CLASS_POSTROLL:
				break; // There are only preRolls
		}
	},

	onPrerollTimer: function () {
		var timeRemaining = vevoEmbed.currentPrerollSlot.getTotalDuration() - vevoEmbed.currentPrerollSlot.getPlayheadTime();

		$(document).trigger({ type: 'Vevo.Ad.PrerollCountdown', time: timeRemaining });
	},

	onSlotEnded: function (event) {
		var slotTimePositionClass = event.slot.getTimePositionClass();
		switch (slotTimePositionClass) {
			case tv.freewheel.SDK.TIME_POSITION_CLASS_PREROLL:
				if (vevoEmbed.preRollSlots.length) {
					vevoEmbed.preRollSlots.shift();
					if (vevoEmbed.preRollSlots.length) {
						vevoEmbed.freewheelInitCallback(true);
					} else {
						//Send Preroll Complete
						$(document).trigger({ type: "Vevo.Ad.PrerollComplete" });


						//Send AdOpportunity Complete 
						$(document).trigger({ type: "Vevo.AdOpportunity.Complete" });

						setTimeout(vevoEmbed.startContentPlayback, 1000);

					}
				}
				break;
			case tv.freewheel.SDK.TIME_POSITION_CLASS_MIDROLL:
			case tv.freewheel.SDK.TIME_POSITION_CLASS_OVERLAY:
			case tv.freewheel.SDK.TIME_POSITION_CLASS_POSTROLL:
				break; // There are only preRolls
		}
	},

	onContentVideoPlay: function (event) {
		vevoEmbed.streamSense.notify(ns_.StreamSense.PlayerEvents.PLAY, {}, vevoEmbed.videoPlayer.currentTime * 1000);
	},
	
	onContentVideoPause: function (event) {
		vevoEmbed.streamSense.notify(ns_.StreamSense.PlayerEvents.PAUSE, {}, vevoEmbed.videoPlayer.currentTime * 1000);
	},

	onContentVideoBuffering: function (event){
		vevoEmbed.streamSense.notify(ns_.StreamSense.PlayerEvents.BUFFER, {}, vevoEmbed.videoPlayer.currentTime * 1000);
	},
	 
	onContentVideoTimeUpdated: function () {
		//This is only to handle midrolls so no need to do anything now.
	},

	onContentVideoEnded: function () {

		vevoEmbed.videoPlayer.off("play", vevoEmbed.onContentVideoPlay);
		vevoEmbed.videoPlayer.off("pause", vevoEmbed.onContentVideoPause);
		vevoEmbed.videoPlayer.off('waiting', vevoEmbed.onContentVideoBuffering);
		vevoEmbed.videoPlayer.off('seeking', vevoEmbed.onContentVideoPause);
		vevoEmbed.videoPlayer.off('timeupdate', vevoEmbed.onContentVideoTimeUpdated);
		vevoEmbed.videoPlayer.off('ended', vevoEmbed.onContentVideoEnded);
		vevoEmbed.adContext.setVideoState(tv.freewheel.SDK.VIDEO_STATE_STOPPED);
		vevoEmbed.adContext.setVideoState(tv.freewheel.SDK.VIDEO_STATE_COMPLETED);
		vevoEmbed.streamSense.notify(ns_.StreamSense.PlayerEvents.END, {}, vevoEmbed.authData.duration);
	},

	authenticateVideo: function (isrc, domain, sbId, callback) {

		var authBaseUrl = "";
		var environment = vevoEmbed.getParameterByName("branch");

		switch (environment) {
			case 'local': authBaseUrl = "http://stg-api.vevo.com/VideoService/AuthenticateVideo"; break;
			case 'staging':
				vevoEmbed.secureHost ? authBaseUrl = "https://stg-api.vevo.com/VideoService/AuthenticateVideo" : authBaseUrl = "http://stg-api.vevo.com/VideoService/AuthenticateVideo";
				break;
			default:
				vevoEmbed.secureHost ? authBaseUrl = "https://api.vevo.com/VideoService/AuthenticateVideo" : authBaseUrl = "http://api.vevo.com/VideoService/AuthenticateVideo";
				break;
		}

		var authUrl = authBaseUrl
						+ "?isrc=" + isrc
						+ "&domain=" + domain
						+ "&pkey=" + sbId;

		if (window.XDomainRequest) {
			// Use Microsoft XDR
			var xdr = new XDomainRequest();
			xdr.open("get", authUrl);
			xdr.onload = function () {
				var data = $.parseJSON(xdr.responseText);
				if (data == null || typeof (data) == 'undefined') {
					data = $.parseJSON(data.firstChild.textContent);
				}
				callback(data);
			};
			xdr.timeout = 1000;
			xdr.send();
		} else {
			var newOptions = {
				url: authUrl,
				success: function (data, status, xhr) {
					callback(data);
				},
				dataType: "json"
			};
			$.ajax(newOptions.url, newOptions);
		}
	},

	getSourceURL: function (data) {
		//Try version 4 (AWS)
		var renditionXML = vevoEmbed.getRenditionXML(data, 2, 4);

		//If there is no rendition try a different source (Level3)
		if (renditionXML.length < 19) {
			renditionXML = vevoEmbed.getRenditionXML(data, 2, 3);
		}

		if (vevoEmbed.secureHost) {
			renditionXML = vevoEmbed.getRenditionXML(data, 2, 3);
		}

		//TODO: Determine High Med Low depending on screen size? or something
		var source = vevoEmbed.getHTML5VideoSourceFromData(renditionXML, "High");

		if (vevoEmbed.secureHost) {
			source = vevoEmbed.replaceUrlPart(source, "s.smil.lvl3.vevo.com", 2);
			source = vevoEmbed.replaceUrlPart(source, "https:", 0);
		}

		return source;
	},

	replaceUrlPart: function (sourceUrl, newHost, index) {
		var slashArray = sourceUrl.split("/");
		slashArray[index] = newHost;

		var newURl = slashArray.join("/");
		return newURl;
	},

	getRenditionXML: function (data, sourceType, version) {
		var theRenditionXML = "";
		$(data.video.videoVersions).each(function (index, videoVersion) {
			if (videoVersion.sourceType == sourceType && videoVersion.version == version) {
				theRenditionXML = videoVersion.data;
			}
		});

		return theRenditionXML;
	},

	getHTML5VideoSourceFromData: function (data, rendition) {
		var xmlDoc = vevoEmbed.createXMLDoc(data);
		var renditionNode = vevoEmbed.getElementWithAttributeValue(xmlDoc, "rendition", "name", rendition);
		var source = renditionNode.getAttribute("url");

		return source;
	},

	createXMLDoc: function (data) {
		var xmlDoc;
		if (window.DOMParser) {
			parser = new DOMParser();
			xmlDoc = parser.parseFromString(data, "text/xml");
		}
		else // Internet Explorer
		{
			xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
			xmlDoc.async = false;
			xmlDoc.loadXML(data);
		}
		return xmlDoc;
	},

	getElementWithAttributeValue: function (xmlDoc, tagName, attribute, attributeValue) {
		var nodeToReturn = null;
		$(xmlDoc.getElementsByTagName(tagName)).each(function (index, nodeObj) {
			if (nodeObj.getAttribute(attribute) == attributeValue) {
				nodeToReturn = nodeObj;
			}
		});
		return nodeToReturn;
	},

	getParameterByName: function (name) {
		name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
		var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
			results = regex.exec(location.search);
		return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
	},
	//*************************************
	//COMSCORE STREAMSENSE FUNCTIONS
	//*************************************

	intializeStreamSense: function () {
		vevoEmbed.streamSense = new ns_.StreamSense({}, 'http://b.scorecardresearch.com/p?c1=2&c2=3005647');
	},

	setStreamSenseClip: function (authData, isAd) {
		//Set Persistent Labels
		var labelsObject = {
			ns_st_mp: "HTML5 Player",
			ns_site: "vevo",
			_site: "vevo-prod",
		};

		vevoEmbed.streamSense.setLabels(labelsObject);
		
		//Ensure there is a program title
		if (authData.video.programTitle.length < 1) {
			authData.video.programtTitle = "music_video";
		}

		//Get Complex Variables
		var name =  vevoEmbed.getStreamSenseName(authData);
		var videoArtist =  vevoEmbed.getStreamSenseArtistList(authData.video.mainArtists);
		var featuredArtist = vevoEmbed.getStreamSenseArtistList(authData.video.featuredArtists)
		var allArtist = featuredArtist.length > 0 ? videoArtist + "|" + featuredArtist : videoArtist;

		//Set Clip Labels
		var clip = {
			ad_load: "no",
			ns_st_cn: "1",
			ns_st_ci: authData.video.isrc,
			video_id: authData.video.isrc,
			ns_st_cl: "" + authData.video.duration * 1000 + "",
			ns_st_pn: "1",
			ns_st_tp: "1",
			ns_st_pr: authData.video.programTitle,
			ns_st_ty: authData.video.streamType,
			ns_st_ge: authData.video.genres.join("|"),
			ns_st_cu: vevoEmbed.getSourceURL(authData),
			syn_id: vevoEmbed.sbId,
			c4: authData.video.urlSafeArtistName,
			video_artist: videoArtist,
			featured_artist: featuredArtist,
			all_artist: allArtist
		};

		if(isAd){
			clip.ad_load = "yes";
			clip.ad_type = "preroll"
		}

		vevoEmbed.streamSense.setClip(clip);
	},
	
	getStreamSenseArtistList: function(artistArray){
		if(artistArray.length == 0){
			return "";
		}
		
		var artist = artistArray[0].urlSafeArtistName;

		if(artistArray.length > 1){
			$(artistArray).each(function(index, artistObj){
				if(index > 0){
					artist = artist + "|" + artistObj.urlSafeArtistName;
				}
			});
		}

		return artist;
	},
	 getStreamSenseName: function(authData){
		var name =  "watch." + authData.video.urlSafeArtistName + "." + authData.video.urlSafetitle + "." + authData.video.isrc;
	 }

};