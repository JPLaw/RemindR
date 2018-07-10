import faker from 'faker';
// import createAccountMockPromise from './account-mock';
import mongoose from 'mongoose';
import Message from '../../model/message';

const createMockMessage = async () => {
  const mockData = {
    accountId: new mongoose.Types.ObjectId(),
    reminderId: new mongoose.Types.ObjectId(),
    sentTo: `1${faker.phone.phoneNumberFormat()}`.replace('-', ''),
    body: faker.lorem.words(5),
  };

  console.log(mockData);

  const message = await new Message(mockData).save();
  return message;
};

export default createMockMessage;
