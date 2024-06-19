import type {EventContext, IOClients} from '@vtex/api'

const axios = require('axios')
const async = require('async');

// CONSTANTS
const accountName = 'todddesantis'
const emailPrefix = 'todd.desantis'
const apiKey = 'vtexappkey-todddesantis-CDHQNI'
const token = 'XNVUPLICXFGSACGQPHHHHZGMTCXQBYCVLWMVWPHVTDDFKEZVTBQBIWAQSRQMTYTKYGOGBACDRLLTBEQDGZOOGEEPRUAGJCVSFEUUVMIYEYKXHSBBQAHZXDSJZHEKLLXV'
const mainWarehouseId = '1_1'
const numOrdersToFire = 3;
const shippingPrice = 500;
const shippingSla = "Standard delivery"

const baseUrl = `https://${accountName}.vtexcommercestable.com.br`
const createOrderEndpoint = '/api/checkout/pub/orders/'
const listAllSkusEndpoint = '/api/catalog_system/pvt/sku/stockkeepingunitids'
const getSkuEndpoint = '/api/catalog/pvt/stockkeepingunit/'
const getPriceEndpoint = '/api/pricing/prices/'
const listInventoryBySkuEndpoint = '/api/logistics/pvt/inventory/skus/'

/*
* Sku object  { skuId = 1, isActive = true, inventory = 100, basePrice = 1000}
* */
let allSkus: any = []

axios.defaults.headers.common["X-VTEX-API-AppToken"] = token;
axios.defaults.headers.common["X-VTEX-API-AppKey"] = apiKey;
axios.defaults.headers.common["Accept"] = "application/json";

// function to select random number between 0 and an upper limit
function pickRandomNumber(upperLimit: number) {
    return Math.floor(Math.random() * (upperLimit + 1));
}

// config for any API calls
const createOrderConfig = {
    params: {
        sc: 1
    }
}

const listSkusConfig = {
    params: {
        page: 1,
        pageSize: 1000
    }
}


// how about some logic to select batches of items to order?
// find activte skus, with price and with inv
// so first what, get a list of all SKUs?
// ...

// Here is my queue used to check for available inventory
const activeSkuQueue = async.queue((sku: any, callback: any) => {
    const endpoint = `${baseUrl}${getSkuEndpoint}${sku.skuId}`
    axios.get(endpoint).then((res: any) => {
        sku.isActive = res.data.IsActive;
        callback(null)
    }).catch((err: any) => {
        callback(new Error(`status: ${err.response.status}, ${err.response.statusText}`))
    })
}, 2); // Concurrency set to 2, meaning only 2 tasks will be processed simultaneously

// Here is my queue used to check for available inventory
const inventoryQueue = async.queue((sku: any, callback: any) => {
    const endpoint = `${baseUrl}${listInventoryBySkuEndpoint}${sku.skuId}`
    axios.get(endpoint).then((res: any) => {
        const allWarehouses = res.data.balance;
        const mainWarehouse = allWarehouses.find((warehouse: any) => warehouse["warehouseId"] === mainWarehouseId)
        const availableInventory = mainWarehouse.totalQuantity - mainWarehouse.reservedQuantity;
        // console.log(`available inventory for sku ${sku.skuId} is: ${availableInventory}`);
        sku.inventory = availableInventory
        callback(null)
    }).catch((err: any) => {
        callback(new Error(`status: ${err.response.status}, ${err.response.statusText}`))
    })
}, 2); // Concurrency set to 2, meaning only 2 tasks will be processed simultaneously

// Here is my queue used to check for available inventory
const getPriceQueue = async.queue((sku: any, callback: any) => {
    const endpoint = `${baseUrl}${getPriceEndpoint}${sku.skuId}`
    // console.log(`endpoint is: ${endpoint}`);
    axios.get(endpoint).then((res: any) => {
        sku.basePrice = res.data.basePrice;
        callback(null)
    }).catch((err: any) => {
        callback(new Error(`status: ${err.response.status}, ${err.response.statusText}`))
    })
}, 2); // Concurrency set to 2, meaning only 2 tasks will be processed simultaneously

inventoryQueue.error((err: any, task: any) => {
    console.error(`Get Inventory Task ${JSON.stringify(task, null, 2)} encountered an error:`, err.message);
})

activeSkuQueue.error((err: any, task: any) => {
    console.error(`Get Active Task ${JSON.stringify(task, null, 2)} encountered an error:`, err.message);
})

/*getPriceQueue.error((err: any, task: any) => {
  // note I am getting for 404 errors when I look for a price. I think these are 3rd party seller items?
  console.error(`Get Price Task ${JSON.stringify(task, null, 2)} encountered an error:`, err.message);
})*/

export async function example(ctx: EventContext<IOClients>) {
    console.log('RECEIVED EVENT', ctx.body)

    /*
  * what fields will change??
  *  email - need a unique email (should fix with login)
  *  items array
  * total price in paymentData
  * */
    let orderData: any = {
        clientProfileData: {
            email: `${emailPrefix}+${Date.now()}@vtex.com`,
            firstName: "Order",
            lastName: "Operator",
            phone: "+2122233432",
            document: "38281916818",
            documentType: "cpf",
            isCorporate: false
        },
        items: [
            // {
            //     id: "1",
            //     quantity: 1,
            //     seller: "1",
            //     price: 1000
            // }
        ],
        shippingData: {
            address: {
                receiverName: "Bootcamp",
                addressId: "Home",
                addressType: "Residential",
                postalCode: "10017",
                city: "New York",
                state: "NY",
                country: "USA",
                street: "11 E 44th st",
                number: "",
                complement: "11 floor",
                reference: null
            },
            logisticsInfo: [
                /* {
                     itemIndex: shippingIndex,
                     selectedSla: shippingSla,
                     price: shippingPrice
                 }*/
            ]
        },
        paymentData: {
            payments: [
                {
                    installments: 1,
                    paymentSystem: "17",
                    groupName: "promissoryPaymentGroup",
                    referenceValue: 1500,
                    value: 1500,
                    accountId: null,
                    hasDefaultBillingAddress: true,
                    installmentsInterestRate: null,
                    tokenId: null
                }
            ]
        }
    }

    // log the email to make sure it's changing
    console.log(`email account: ${orderData.clientProfileData.email}`);

    // Get all Skus, and queue them to check if they are active
    axios.get(`${baseUrl}${listAllSkusEndpoint}`, listSkusConfig).then((res: any) => {
        console.log(`Full list of SKUs is ${res.data}`);

        // we are going to make objects now
        res.data.forEach((sku: any) => {
            if(sku < 100) {
              allSkus.push({skuId: sku})
            }
        })

        // first check to make sure they are active
        allSkus.forEach((sku: any) => {
            activeSkuQueue.push(sku);
        })

        // push all SKUs onto the queue to check their inventory
        /*    allSkus.forEach((sku) => {
                inventoryQueue.push(sku);
            })*/

        console.log('All SKUs pushed into the queue');

    }).catch((err: any) => {
        // error calling list skus endpoint
        console.log(`status: ${err.response.status}, ${err.response.statusText}`);
    })

// once I check if SKUs are active...
    activeSkuQueue.drain(() => {
        console.log('All skus have been processed for checking if they are active');
        // console.log(`new array with deleted SKUs for inactive: ${JSON.stringify(allSkus, null, 2)}`);

        // now do the inventory
        allSkus.forEach((sku: any) => {
            if (sku.isActive === true) {
                inventoryQueue.push(sku)
            }
        })
    });

// this fires when all inventory is checked. next is to check if they have a price
    inventoryQueue.drain(() => {
        console.log('All skus inventory has been processed');
        // console.log(`sku array: ${JSON.stringify(allSkus, null, 2)}`);

        // so here we know Sku IDs, whether they are active and whether they have inventory.
        // next need price
        allSkus.forEach((sku: any) => {
            if (sku.isActive === true && sku.inventory >= 50) {
                getPriceQueue.push(sku)
            }
        })
    });

// get prices, create the set of SKUs to order, and create the order
    getPriceQueue.drain(() => {
        // now should have it all
        // Now it is time to place orders, I have a fully populated array!
        console.log('price has been added to all skus');

        // clear out any items with any missing data
        const filteredSkus = allSkus.filter((sku: { isActive: boolean; inventory: any; basePrice: any; }) => sku.isActive && sku.inventory && sku.basePrice)

        // console.log(`filtered sku array: ${JSON.stringify(filteredSkus, null, 2)}`);

        let skusToOrder = []

        // select the SKUs at random from the filtered list
        for (let i = 0; i < numOrdersToFire; i++) {
            const elementToPush = pickRandomNumber(filteredSkus.length - 1)
            // console.log(`elementToPush is: ${elementToPush}`);
            skusToOrder.push(filteredSkus[elementToPush])
        }

        // console.log(`skus to Order: ${JSON.stringify(skusToOrder, null, 2)}`);

        // so now I have my set of Skus to order

        // first step is to now create the order data
        // quantity is random 1-5
        skusToOrder.forEach((sku: any, skuIndex: number) => {

            orderData.items.push({
                id: sku.skuId.toString(),
                quantity: pickRandomNumber(4) + 1,
                seller: "1",
                price: sku.basePrice * 100
            })

            let priceToPush;

            if (skuIndex === 0) {
                priceToPush = shippingPrice
            } else {
                priceToPush = 0
            }

            orderData.shippingData.logisticsInfo.push({
                itemIndex: skuIndex,
                selectedSla: shippingSla,
                price: priceToPush
            })
        })


        // next need to compute the total amount
        let totalAmount = 0;
        orderData.items.forEach((item: any) => {
            totalAmount = totalAmount + (item.price * item.quantity)
        })
        // now add the shipping cost
        totalAmount = totalAmount + orderData.shippingData.logisticsInfo[0].price;
        // is it always in 0 place in the array? let's hope so
        orderData.paymentData.payments[0].referenceValue = totalAmount
        orderData.paymentData.payments[0].value = totalAmount

        // console.log(`orderData before firing: ${JSON.stringify(orderData, null, 2)}`);

        // then fire the order with all 3 calls
        axios.put(`${baseUrl}${createOrderEndpoint}`, orderData, createOrderConfig).then((res: any) => {
            // console.log(`output is ${JSON.stringify(res.data, null, 2)}`);
            const orderGroup = res.data.orders[0].orderGroup;
            const transactionId = res.data.transactionData.merchantTransactions[0].transactionId;
            console.log(`order went through! transactionId: ${transactionId}, orderGroup: ${orderGroup}`);
            // next two commands here
            // ...
            const createPaymentData = [
                {
                    "hasDefaultBillingAddress": true,
                    "installmentsInterestRate": 0,
                    "referenceValue": totalAmount,
                    "bin": null,
                    "accountId": null,
                    "value": totalAmount,
                    "tokenId": null,
                    "paymentSystem": "17",
                    "isBillingAddressDifferent": false,
                    "fields": {},
                    "installments": 1,
                    "chooseToUseNewCard": false,
                    "id": transactionId,
                    "interestRate": 0,
                    "installmentValue": totalAmount,
                    "transaction": {
                        "id": transactionId,
                        "merchantName": accountName
                    },
                    "installmentsValue": 750,
                    "currencyCode": "USD",
                    "originalPaymentIndex": 0,
                    "groupName": "null"
                }
            ]
            const createPaymentUrl = `https://${accountName}.vtexpayments.com.br/api/pub/transactions/${transactionId}/payments`

            // create the payment
            axios.post(createPaymentUrl, createPaymentData).then(() => {
                console.log('payment data success! time to process order');

                // lastly process the order
                axios.post(`${baseUrl}/api/checkout/pub/gatewayCallback/${orderGroup}`).then(() => {
                    console.log(`order processed!`);
                }).catch((err: any) => {
                    console.log(`process order error, status: ${err.response.status}, ${err.response.statusText}`);
                })
            }).catch((err: any) => {
                console.log(`create payment error, status: ${err.response.status}, ${err.response.statusText}`);
            })
        }).catch((err: any) => {
            // console.log(err);
            console.log(`order post error, status: ${err.response.status}, ${err.response.statusText}`);
            console.log(`full error: ${err}`);
            // console.log(`full error: ${JSON.stringify(err, null, 2)}`);
            // console.log(`error response: ${JSON.stringify(err.response, null, 2)}`);
        })
    })
    return true
}
