import orderCapacityQueueService from '../services/OrderCapacityQueueService.js';

class OrderCapacityQueueJob {
  async execute() {
    return orderCapacityQueueService.drainAll();
  }
}

export default new OrderCapacityQueueJob();
