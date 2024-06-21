import type {EventContext, IOClients} from '@vtex/api'

const axios = require('axios')

// CONSTANTS
const accountName = 'todddesantis'
const emailPrefix = 'todd.desantis'
const apiKey = 'vtexappkey-todddesantis-CDHQNI'
const token = 'XNVUPLICXFGSACGQPHHHHZGMTCXQBYCVLWMVWPHVTDDFKEZVTBQBIWAQSRQMTYTKYGOGBACDRLLTBEQDGZOOGEEPRUAGJCVSFEUUVMIYEYKXHSBBQAHZXDSJZHEKLLXV'
const numItemsToFire = 3;
const shippingPrice = 500;
const shippingSla = "Standard delivery"
const baseUrl = `https://${accountName}.vtexcommercestable.com.br`
const createOrderEndpoint = '/api/checkout/pub/orders/'
const skuList = [32, 255, 33, 7, 4]
const simulationEndpoint = '/api/checkout/pub/orderforms/simulation?sc=1'

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
        receiverName: "Randy Receiver",
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

  let skusToOrder: any = []

  // select the SKUs at random from the filtered list
  for (let i = 0; i < numItemsToFire; i++) {
    const elementToPush = pickRandomNumber(skuList.length - 1)
    skusToOrder.push(skuList[elementToPush])
  }

  const simulationData: any = {
    items: [],
    country: 'USA'
  }
  skusToOrder.forEach((sku: any) => {
    simulationData.items.push({id: sku, quantity: 1, seller: 1})
  })

  // need to get prices
  axios.post(`${baseUrl}${simulationEndpoint}`, simulationData).then((res: any) => {
    const simulatedItems = res.data.items;

    //Sku object  { skuId = 1, basePrice = 1000}
    let skuObjects: any = []
    simulatedItems.forEach((item: any) => {
      skuObjects.push({skuId: item.id, basePrice: item.price})
    })

    console.log('skuObjects are: ', `${JSON.stringify(skuObjects, null, 2)}`);
    // create the order data
    // quantity is random 1-5
    skuObjects.forEach((sku: any, skuIndex: number) => {
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

  }).catch((err: any) => {
    console.log(err);
  })


  return true
}
