console.log("[CrypTourWeb] Using Cryp-Tour Web Lib: https://github.com/Cryp-Tour");
CrypTourWeb = {
    accounts: null,
    debug: false,
    web3provider: null,
    tourtokens: [],
    lps: [],
    contracts: {},
    listeners: {
        onload: []
    },
    contractJSONPaths: ["contracts/BPool.json",
        "contracts/BFactory.json",
        "contracts/BToken.json",
        "contracts/TourTokenFactory.json",
        "contracts/TourTokenTemplate.json",
        "contracts/TToken.json",
        "contracts/IERC20.json"
    ],
    state: {
        initWeb3: false,
        initContracts: 0
    },

    addOnLoadListener: function (callback) {
        CrypTourWeb.listeners.onload.push(callback);
    },

    init: async function () {
        return CrypTourWeb.initWeb3();
    },

    initWeb3: function () {
        if (CrypTourWeb.debug)
            console.log("[CrypTourWeb] Init Web3")
        // Modern dapp browsers...
        if (window.ethereum) {
            if (CrypTourWeb.debug)
                console.log("[CrypTourWeb] Init Web3 as window.ethereum")
            CrypTourWeb.web3Provider = new Web3(window.ethereum);
        }
        // Legacy dapp browsers...
        else if (window.web3) {
            if (CrypTourWeb.debug)
                console.log("[CrypTourWeb] Init Web3 as window.web3")
            CrypTourWeb.web3Provider = new Web3(window.web3.currentProvider);
        }
        // TODO: fallback for not compatible Browsers
        CrypTourWeb.state.initWeb3 = true;
        CrypTourWeb.initContract();
    },

    initContract: function () {
        CrypTourWeb.contractJSONPaths.forEach(path => {
            if (CrypTourWeb.debug)
                console.log("[CrypTourWeb] Get Contract " + path)

            CrypTourWeb.web3Provider.eth.net.getId().then((networkID) => {
                $.getJSON(path, (data) => {
                    // Get the necessary contract artifact file and instantiate it with web3
                    let ContractArtifact = data;
                    let name = ContractArtifact.contractName;
                    if (ContractArtifact.networks[networkID]) {
                        CrypTourWeb.contracts[name] = new CrypTourWeb.web3Provider.eth.Contract(ContractArtifact.abi,
                            ContractArtifact.networks[networkID].address);
                    }
                    else {
                        CrypTourWeb.contracts[name] = new CrypTourWeb.web3Provider.eth.Contract(ContractArtifact.abi);
                    }

                    CrypTourWeb.contracts[name].options.data = ContractArtifact.bytecode;
                    // Call Listener for Onload 
                    CrypTourWeb.state.initContracts++;
                    if (CrypTourWeb.state.initContracts == CrypTourWeb.contractJSONPaths.length) {
                        CrypTourWeb.__callListeners(CrypTourWeb.listeners.onload, undefined);

                        if (CrypTourWeb.debug)
                            console.log("[CrypTourWeb] Got all Contracts")
                    }
                });
            })
        })
    },

    __callListeners: function (listeners, data) {
        listeners.forEach(listener => {
            listener(data);
        });
    },

    // Returns a Promise
    initWallet: function () {
        var x = new Promise((resolve, reject) => {

            if (CrypTourWeb.debug)
                console.log("[CrypTourWeb] Init Wallet")
            if (window.ethereum) {
                // Request account access
                window.ethereum.request({ method: 'eth_requestAccounts' }).then(() => {
                    CrypTourWeb.__initWallet2(resolve);
                }).catch((error) => {
                    // User denied account access...
                    if (CrypTourWeb.debug)
                        console.error("User denied account access")
                    reject(error);
                })
            }
            else
                CrypTourWeb.__initWallet2(resolve);

        })
        return x;
    },

    __initWallet2: function (resolve) {
        web3 = new Web3(CrypTourWeb.web3Provider);
        web3.eth.getAccounts(function (error, accounts) {
            if (error) {
                if (CrypTourWeb.debug)
                    console.log(error);
                reject(error);
            }
            CrypTourWeb.accounts = accounts;

            if (CrypTourWeb.debug) {
                console.log("[CrypTourWeb] Accounts are: ");
                console.log(accounts);
            }
            resolve();
        });
    },

    createTokenForDataset: function (blob, name, symbol, cap, mint) {
        x = new Promise((resolve, reject) => {
            let resolveVals = []
            CrypTourWeb.contracts['TourTokenFactory'].methods.createToken(blob, name, symbol, cap)
                .send({ from: CrypTourWeb.accounts[0] })
                .then((res1) => {
                    resolveVals.push(res1)
                    CrypTourWeb.tourtokens.push(res1.events['TokenRegistered'].returnValues.tokenAddress)

                    let tt = new CrypTourWeb.web3Provider.eth.Contract(CrypTourWeb.contracts["TourTokenTemplate"]._jsonInterface, 
                                res1.events['TokenRegistered'].returnValues.tokenAddress)
                    return tt.methods.mint(CrypTourWeb.accounts[0], mint)
                        .send({ from: CrypTourWeb.accounts[0] })
                })
                .then((res2) =>{
                    resolveVals.push(res2)
                    resolve(resolveVals)
                })
                .catch((err) => { reject(err) })
        })
        return x;
    },

    createLP: function () {
        x = new Promise((resolve, reject) => {
            CrypTourWeb.contracts["BFactory"].methods.newBPool()
                .send({ from: CrypTourWeb.accounts[0] })
                .then((res) => {
                    CrypTourWeb.lps.push(res.events['LOG_NEW_POOL'].returnValues.pool)
                    resolve(res)
                })
                .catch((err) => { reject(err) })
        });
        return x;
    },

    // Tokens must be ERC20
    startLP: function (token1, address1, token2, address2, lp) {
        x = new Promise((resolve, reject) => {
            let pool_contract = new CrypTourWeb.web3Provider.eth.Contract(CrypTourWeb.contracts["BPool"]._jsonInterface, lp)
            let token1_contract = new CrypTourWeb.web3Provider.eth.Contract(CrypTourWeb.contracts["IERC20"]._jsonInterface, address1)
            let token2_contract = new CrypTourWeb.web3Provider.eth.Contract(CrypTourWeb.contracts["IERC20"]._jsonInterface, address2)
            let responses = []
            token1_contract.methods.approve(lp, token1)
                .send({ from: CrypTourWeb.accounts[0] })
                .then((res) => {
                    responses.push(res)
                    if (CrypTourWeb.debug)
                        console.log(res)
                    return token2_contract.methods.approve(lp, token2)
                        .send({ from: CrypTourWeb.accounts[0] })
                })
                .then((res) => {
                    responses.push(res)
                    if (CrypTourWeb.debug)
                        console.log(res)

                    return pool_contract.methods.bind(address1, token1, token1)
                        .send({ from: CrypTourWeb.accounts[0] })
                })
                .then((res) => {
                    responses.push(res)
                    if (CrypTourWeb.debug)
                        console.log("Bound Token1")
                    return pool_contract.methods.bind(address2, token2, token2)
                        .send({ from: CrypTourWeb.accounts[0] })
                })
                .then((res) => {
                    responses.push(res)
                    if (CrypTourWeb.debug)
                        console.log("Bound Token2")
                    return pool_contract.methods.finalize()
                        .send({ from: CrypTourWeb.accounts[0] })
                })
                .then((res) => {
                    responses.push(res)
                    if (CrypTourWeb.debug)
                        console.log("Finalized")
                    resolve(responses)
                })
                .catch((err) => { reject(err) })
        })
        return x;
    },

    // Swap TT to WETH or similar
    swapInLP: function () {

    },

    // Swap WETH or similar to TT
    swapOutLP: function () {

    },

    // Stake Liquidity Pool
    stakeLP: function () 
    {

    },

    exitLP: function () {

    },

    // Consume TourToken
    consumeTT: function () {

    },

    // Gets Balance of user at contract, if bigger than one, return true, otherwise return false
    canConsumeTTat: function () {

    },

    // Check wether LP can be swapped with
    getStatusOfLP: function (address) {

    },

    // Check Status of TT
    getStatusOfTT: function (address) {

    }

}
