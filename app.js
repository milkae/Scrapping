var app = {
	//CHARGEMENT DES DEPENDANCES
	fs : require('fs'),
	request : require('request'),
	cheerio : require('cheerio'),
	sha1 : require('sha1'),

	//DECLARATION VARIABLES
	lignes : ['ligne11.html', 'ligne12.html', 'ligne52.html'],
	json : {data : {}},

	//Regex pour le camelCase
	camelRegF : /(?:^\w|[A-Z]|\b\w)/g,
	camelRegR : /\s+/g,

	//LANCEMENT
	init : function(){
		app.boucle();
		app.writeJson('data.json', app.json);
	},
	//Boucle pour les 3 lignes de bus
	boucle : function(){
		for (var i = 0; i < 3; i++) {
			app.testPage(i, 0);
			app.testPage(i, 1);
		}
	},

	//DECLARATION METHODES
	url : function(num) {
		return 'http://www.tisseo.fr/sites/default/files/' + app.lignes[num];
	},
	cacheFile : function(num) {
		return 'cache/' + app.sha1(app.url(num));
	},
	camelize : function(str) {    //CamelCase
		return str.replace(app.CamelRegF, function(letter, index) {
			return index == 0 ? letter.toLowerCase() : letter.toUpperCase();
		}).replace(app.camelRegR, '');
	},
	//Test existence de la page dans le dossier cache
	testPage : function(num, sens){
		try {
			app.fs.accessSync(app.cacheFile(num), app.fs.F_OK); //Si la page n'existe pas renvoie une erreur -> block catch
			app.readFile(num, sens);
		} catch (e) {
			app.makeRequest(num, sens);
		}
	},
	readFile : function(num, sens){
		var data = app.fs.readFileSync(app.cacheFile(num), 'utf-8');
		app.traitement(data, sens);
	},
	makeRequest : function(num, sens){
		app.request(app.url(num), function(error, response, html){
			if(!error){
				app.writeHtml(app.cacheFile(num), html); //On recupère le contenu de la requête dans un fichier
				app.traitement(html, sens);
			}
		});
	},
	traitement : function(html, sens) {
		$ = app.cheerio.load(html);
		var titre = $('h1').text().trim();
		var n = sens;   
		if(sens === 1) {
			n = 5;       //Le h2 du trajet retour est en pos 1 mais sont tableau en pos 5
		}
		var node = $('table').eq(n);
		var direction = $('h2').eq(sens).text();
		node.filter(function(){
			var data = $(this);
			var lignes = data.children('tr');
			var resultTab = app.browseArrets(lignes); //Recup parcours arrêts/horaires
			app.json.data[titre] = titre && app.json.data[titre] || {}; //insertion du titre dans le json si n'existe pas (sans l'écraser au calcul du trajet retour)
			app.json.data[titre][direction] = resultTab;
		});
	},
	//Parcours arrêts
	browseArrets : function (nodeTab){
		var resultTab = [];
		for (var i = 1, c = nodeTab.length; i < c; i++) { // A i = 0 on a le nom du terminus repété
			var arret = {name : "", slug : "", horaires : []};
			var childs = nodeTab.eq(i).children();
			arret.name = childs.first().text();
			arret.slug = app.camelize(arret.name);
			var result = app.browseHours(childs, arret); // Recup de l'objet arret avec ses horaires
			resultTab.push(result);
		}
		return resultTab;
	},
	browseHours : function(currentTab, arret){
		for (var i = 1, c = currentTab.length; i < c; i++) {   // A i = 0 on a...le nom de l'arrêt
			var hour = currentTab.eq(i).text();
			arret.horaires.push(hour);
		}
		return arret;
	},
	writeJson : function(path, content) {
		app.fs.writeFile(path, JSON.stringify(content, null, 4), function(err){
			console.log('File successfully written! - Check your project directory for the output.json file');
		});
	},
	writeHtml : function(file, html) {
		app.fs.writeFile(file, html, 'utf-8', function(err){
			console.log('File successfully written!');
		});
	}
};
app.init();