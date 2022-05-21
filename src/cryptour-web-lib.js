console.log("[CrypTourWeb] Using Cryp-Tour Web Lib: https://github.com/Cryp-Tour");


function _multWithDec(x, dec) {
    return CrypTourWeb.web3Provider.utils.fromWei(CrypTourWeb.web3Provider.utils.toBN(x).mul(CrypTourWeb.web3Provider.utils.toBN(CrypTourWeb.web3Provider.utils.toWei(dec))))
}

CrypTourWeb = {
    accounts: null,
    erc20TokenIn: null,
    debug: false,
    web3provider: null,
    contracts: {},
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

    init: async function () {
        let x = new Promise((resolve, reject) => {
            CrypTourWeb.initWeb3(resolve, reject);
        })
        return x;
    },

    initWeb3: function (resolve, reject) {
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
        else
        {
            reject("No Web3 available")
        }
        // TODO: fallback for not compatible Browsers
        CrypTourWeb.state.initWeb3 = true;
        if (CrypTourWeb.debug)
            console.log(CrypTourWeb.web3Provider)
        CrypTourWeb.initContract(resolve, reject);
    },

    initContract: function (resolve, reject) {
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
                        resolve(true)
                        if (CrypTourWeb.debug)
                            console.log("[CrypTourWeb] Got all Contracts")
                    }
                });
            })
        })
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
            CrypTourWeb.contracts['TourTokenFactory'].methods.createToken(blob, name, symbol, 
                    cap)
                .send({ from: CrypTourWeb.accounts[0] })
                .then((res1) => {
                    resolveVals.push(res1)

                    let tt = new CrypTourWeb.web3Provider.eth.Contract(CrypTourWeb.contracts["TourTokenTemplate"]._jsonInterface, 
                                res1.events['TokenRegistered'].returnValues.tokenAddress)
                    return tt.methods.mint(CrypTourWeb.accounts[0], 
                            mint)
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
                    resolve([ res ])
                })
                .catch((err) => { reject(err) })
        });
        return x;
    },

    // Tokens must be ERC20 or some Tx might fail
    startLP: function (token1, token2, address2, lp) {
        x = new Promise((resolve, reject) => {
            if (CrypTourWeb.erc20TokenIn == null)
                reject("Token In hasnt been set")
            let pool_contract = new CrypTourWeb.web3Provider.eth.Contract(CrypTourWeb.contracts["BPool"]._jsonInterface, lp)
            let token1_contract = new CrypTourWeb.web3Provider.eth.Contract(CrypTourWeb.contracts["IERC20"]._jsonInterface, CrypTourWeb.erc20TokenIn)
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

                    return pool_contract.methods.bind(CrypTourWeb.erc20TokenIn, 
                            token1, CrypTourWeb.web3Provider.utils.toWei('1'))
                        .send({ from: CrypTourWeb.accounts[0] })
                })
                .then((res) => {
                    responses.push(res)
                    if (CrypTourWeb.debug)
                        console.log("Bound Token1")
                    return pool_contract.methods.bind(address2, token2, CrypTourWeb.web3Provider.utils.toWei('1'))
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

    recommParamsForGetTT: function (lp, TTAddress, amountOut) {
        let x = new Promise((resolve, reject) => {
            let responses = {
                transactions: [],
                result: {
                    spotPrice: {
                        wei: null,
                        main: null
                    },
                    maxAmountIn: {
                        wei: null,
                        main: null
                    },
                    maxPrice: {
                        wei: null,
                        main: null
                    }
                }
            }
            CrypTourWeb.getSpotPrice(lp, TTAddress)
            .then((res) => {
                responses.result.spotPrice = res.result.spotPrice
                responses.result.maxPrice.wei = CrypTourWeb.web3Provider.utils.toBN('2').mul(
                                                    CrypTourWeb.web3Provider.utils.toBN(res.result.spotPrice.wei))
                responses.result.maxAmountIn.wei = CrypTourWeb.web3Provider.utils.fromWei(responses.result.maxPrice.wei.mul(
                                                    CrypTourWeb.web3Provider.utils.toBN(amountOut))).split('.')[0]
                resolve(responses)
            })
            .catch(err => {
                reject(err, responses)
            })
        })
        return x;
    },

    // Get TT from Pool
    getTT: function (lp, maxAmountIn, TTAddress, amountOut, maxPrice) {
        x = new Promise((resolve, reject) => {
            if (CrypTourWeb.erc20TokenIn == null)
                reject("Token In hasnt been set")
            let responses = {
                transactions: [],
                result: {}
            }
            let pool_contract = new CrypTourWeb.web3Provider.eth.Contract(CrypTourWeb.contracts["BPool"]._jsonInterface, lp)
            let token1_contract = new CrypTourWeb.web3Provider.eth.Contract(CrypTourWeb.contracts["IERC20"]._jsonInterface, CrypTourWeb.erc20TokenIn)
            token1_contract.methods.approve(lp, maxAmountIn)
            .send({ from: CrypTourWeb.accounts[0] })
            .then((res) => {
                responses.transactions.push(res)
                if (CrypTourWeb.debug)
                    console.log("Approved Token for swapping exact amount out")
                return pool_contract.methods.swapExactAmountOut(CrypTourWeb.erc20TokenIn, maxAmountIn, TTAddress, amountOut, maxPrice)
                .send({ from: CrypTourWeb.accounts[0] })
            })
            .then((res) => {
                responses.transactions.push(res)
                responses.result = true
                if (CrypTourWeb.debug)
                    console.log("Swapped for TT")
                resolve(responses)
            })
            .catch((err) => { reject(err, responses) })
        })
        return x;
    },

    getSpotPrice: function (lp, tokenOut) {
        x = new Promise((resolve, reject) => {
            if (CrypTourWeb.erc20TokenIn == null)
                reject("Token In hasnt been set")
            let responses = {
                transactions: [],
                result: {
                    spotPrice: {
                        wei: null,
                        main: null
                    }
                }
            }
            let pool_contract = new CrypTourWeb.web3Provider.eth.Contract(CrypTourWeb.contracts["BPool"]._jsonInterface, lp)
            res = pool_contract.methods.getSpotPrice(CrypTourWeb.erc20TokenIn, tokenOut)
            .call({ from: CrypTourWeb.accounts[0] })
            .then((res) => {
                if (CrypTourWeb.debug)
                    console.log(res)
                responses.result.spotPrice.main = CrypTourWeb.web3Provider.utils.fromWei(res)
                responses.result.spotPrice.wei = res
                resolve(responses)
            })
            .catch((err) => { reject(err, responses) })
        })
        return x;
    },

    recommParamsForStakeLP: function (lp, tt, amountinToken) {
        let x = new Promise((resolve, reject) => {
            if (CrypTourWeb.erc20TokenIn == null)
                reject("Token In hasnt been set")
            let responses = {
                transactions: [],
                result: {
                    spotPrice: {
                        wei: null,
                        main: null
                    },
                    balances: {},
                    recomm: {}
                }
            }

            let pool_contract = new CrypTourWeb.web3Provider.eth.Contract(CrypTourWeb.contracts["BPool"]._jsonInterface, lp)
            res = pool_contract.methods.getSpotPriceSansFee(CrypTourWeb.erc20TokenIn, tt)
            .call({ from: CrypTourWeb.accounts[0] })
            .then((res) => {
                if (CrypTourWeb.debug)
                    console.log(res)
                responses.result.spotPrice.main = CrypTourWeb.web3Provider.utils.fromWei(res)
                responses.result.spotPrice.wei = res
                
                return pool_contract.methods.getBalance(CrypTourWeb.erc20TokenIn)
                        .call({ from: CrypTourWeb.accounts[0] })
            })
            .then((res) => {
                responses.result.balances.weth = res
                return pool_contract.methods.getBalance(tt)
                        .call({ from: CrypTourWeb.accounts[0] })
            })
            .then((res) => {
                responses.result.balances.tt = res

                return pool_contract.methods.totalSupply()
                        .call({ from: CrypTourWeb.accounts[0] })
            })
            .then((res) => {
                responses.result.balances.lp = res
                let temp = CrypTourWeb.web3Provider.utils.toBN(responses.result.balances.weth)
                let ratio = CrypTourWeb.web3Provider.utils.toBN(CrypTourWeb.web3Provider.utils.toWei(amountinToken)).div(temp)

                responses.result.recomm.maxttin = _multWithDec(CrypTourWeb.web3Provider.utils.fromWei(ratio.mul(CrypTourWeb.web3Provider.utils.toBN(responses.result.balances.tt))), "1.2").split('.')[0]
                responses.result.recomm.maxwethin = _multWithDec(amountinToken, "1.2").split('.')[0]
                responses.result.recomm.lpout = CrypTourWeb.web3Provider.utils.fromWei(ratio.mul(CrypTourWeb.web3Provider.utils.toBN(res))).split('.')[0]
                responses.result.recomm.ratio = ratio.toString().split('.')[0]
                resolve(responses)
            })
            .catch((err) => { reject(err, responses) })
        })
        return x
    },

    // Stake Liquidity Pool
    stakeLP: function (lp, tt, lpout, maxAmountsInTT, maxAmountsInERC20) 
    {
        x = new Promise((resolve, reject) => {
            let responses = {
                transactions: [],
                result: {
                    spotPrice: {
                        wei: null,
                        main: null
                    },
                    balances: {},
                    recomm: {}
                }
            }


            let pool_contract = new CrypTourWeb.web3Provider.eth.Contract(CrypTourWeb.contracts["BPool"]._jsonInterface, lp)
            let token1_contract = new CrypTourWeb.web3Provider.eth.Contract(CrypTourWeb.contracts["IERC20"]._jsonInterface, CrypTourWeb.erc20TokenIn)
            let tt_contract = new CrypTourWeb.web3Provider.eth.Contract(CrypTourWeb.contracts["IERC20"]._jsonInterface, tt)
            token1_contract.methods.approve(lp, maxAmountsInERC20)
            .send({ from: CrypTourWeb.accounts[0] })
            .then((res) => {
                responses.transactions.push(res)
                return tt_contract.methods.approve(lp, maxAmountsInTT)
                        .send({ from: CrypTourWeb.accounts[0] })})
            .then((res) => {
                responses.transactions.push(res)
                return pool_contract.methods.joinPool(lpout, [maxAmountsInERC20, maxAmountsInTT])
                    .send({ from: CrypTourWeb.accounts[0] })
            })
            .then((res) => {
                responses.transactions.push(res)
                resolve(responses)
            })
            .catch((err) => { reject(err, responses) })
        })
        return x
    },
    
    recommParamsForExitLP: function () {

    },

    // Exit Liquidity Pool
    exitLP: function (lp, lpTokenIn) {
        x = new Promise((resolve, reject) => {
            let responses = {
                transactions: []
            }
            let pool_contract = new CrypTourWeb.web3Provider.eth.Contract(CrypTourWeb.contracts["BPool"]._jsonInterface, lp)
            pool_contract.methods.exitPool(lpTokenIn, [0, 0])
            .send({ from: CrypTourWeb.accounts[0] })
            .then((res) =>{
                responses.transactions.push(res)
                resolve(responses)
            })
            .catch((err) => { reject(err, responses) })
        })
        return x
    },

    // Consume TourToken
    consumeTT: function (TTAddress, serviceId) {
        let x = new Promise((resolve, reject) => {
            let responses = {
                transactions: [],
                result: {
                    canConsume: null,
                    minter: null
                }
            }
            CrypTourWeb.canConsumeTTat(TTAddress)
            .then(res => {
                if (res.result.canConsume)
                {
                    responses.result.canConsume = true
                    let tourtoken = new CrypTourWeb.web3Provider.eth.Contract(CrypTourWeb.contracts["TourTokenTemplate"]._jsonInterface, TTAddress)
                    tourtoken.methods.startOrder(CrypTourWeb.accounts[0], 
                        CrypTourWeb.web3Provider.utils.toWei('1'),
                        serviceId,
                        CrypTourWeb.accounts[0])
                    .send({ from: CrypTourWeb.accounts[0] })
                    .then((res) => {
                        console.log(res)
                        responses.transactions.push(res)
                        resolve(responses)
                    })
                    .catch(err => {
                        reject(err)
                    })

                }
                else
                {
                    responses.result.canConsume = false
                    reject(responses)
                }
            })
        })
        return x;
    },

    // Gets Balance of user at contract, if bigger than one, return true, otherwise return false
    canConsumeTTat: function (TTAddress) {
        let x = new Promise((resolve, reject) => {
            let responses = {
                transactions: [],
                result: {
                    canConsume: null
                }
            }
            let tt_contract = new CrypTourWeb.web3Provider.eth.Contract(CrypTourWeb.contracts["IERC20"]._jsonInterface, TTAddress)
            tt_contract.methods.balanceOf(CrypTourWeb.accounts[0])
            .call({ from: CrypTourWeb.accounts[0] })
            .then((res) => {
                let needed = CrypTourWeb.web3Provider.utils.toWei("1.001")
                if (res > needed)
                {
                    responses.result.canConsume = true
                }
                else
                {
                    responses.result.canConsume = false
                }
                resolve(responses)
            })
            .catch(err => {
                reject(err)
            })
        })
        return x;
    }
}
