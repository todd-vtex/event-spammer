# Order Operator

Instructions to use:

- edit manifest.json file and set the policies for "outbound-access" to your account name
- create a copy of "configExample.js" and call it "config.js". Fill it out with your values
- NOTE: the value for 'shippingSla' is not the name of the shipping policy, but the name of the shipping method
- Create a dev workspace and link it
- Go to this URL in a browser to start the engine:
- https://workspaceName--accountName.myvtex.com/_v/app/order-operator/startEngine

- Go here to stop it:
- https://workspaceName--accountName.myvtex.com/_v/app/order-operator/stopEngine

NOTES:
- Please disable any shipping promotions that change the shipping price as this will break it. the calls I make use math to add up the amount and the shipping amount needs to be correct
- Good luck!
