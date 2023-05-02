You have to set same varaiable in PHP and Node.js
Please encode in PHP with varaiable which is in <root>/lib/config.json

{
	"OPENSSL_ALGORITHM": "aes-128-ctr",
	"OPENSSL_KEY": "bc7316929fe1545b",
	"OPENSSL_IV": "1234567891011121"
}



The length of OPENSSL_KEY must be 16.
If you want change key and iv, edit <root>/lib/config.json file, and use them in PHP.