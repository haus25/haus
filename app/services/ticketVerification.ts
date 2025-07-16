import { parseAbi, getContract, type WalletClient } from 'viem';

// TicketKiosk ABI - extracted from TicketKiosk.sol
export const TICKET_KIOSK_ABI = parseAbi([
  // View functions for ticket verification
  'function hasTicketForEvent(address user, uint256 eventId) external view returns (bool)',
  'function getUserTickets(address user) external view returns (uint256[] memory)',
  'function getTicketInfo(uint256 ticketId) external view returns (uint256 eventId, address owner, address originalOwner, uint256 purchasePrice, uint256 purchaseTimestamp, string memory name, string memory artCategory, string memory metadataURI)',
  'function getSalesInfo() external view returns (uint256 totalTickets, uint256 soldTickets, uint256 remainingTickets, uint256 price, string memory artCategory)',
  'function isAvailable() external view returns (bool)',
  'function totalSupply() external view returns (uint256)',
  
  // Public variables
  'function eventId() external view returns (uint256)',
  'function creator() external view returns (address)',
  'function ticketPrice() external view returns (uint256)',
  'function ticketsAmount() external view returns (uint256)',
  'function ticketsSold() external view returns (uint256)',
  'function artCategory() external view returns (string)',
  'function hasTicket(address) external view returns (bool)',
  
  // Purchase function
  'function purchaseTicket() external payable returns (uint256 ticketId)',
  
  // Events
  'event TicketMinted(uint256 indexed ticketId, address indexed buyer, string ticketName, string artCategory, uint256 price)'
]);

export interface TicketInfo {
  ticketId: number;
  eventId: number;
  owner: string;
  originalOwner: string;
  purchasePrice: string;
  purchaseTimestamp: number;
  name: string;
  artCategory: string;
  metadataURI: string;
}

export interface EventSalesInfo {
  totalTickets: number;
  soldTickets: number;
  remainingTickets: number;
  price: string;
  artCategory: string;
}

class TicketVerificationService {
  private walletClient: WalletClient;

  constructor(walletClient: WalletClient) {
    this.walletClient = walletClient;
  }

  /**
   * Get TicketKiosk contract instance
   */
  private getTicketKioskContract(ticketKioskAddress: string) {
    return getContract({
      address: ticketKioskAddress as `0x${string}`,
      abi: TICKET_KIOSK_ABI,
      client: this.walletClient
    });
  }

  /**
   * Verify if user has a ticket for a specific event
   */
  async verifyTicketForEvent(
    ticketKioskAddress: string,
    userAddress: string,
    eventId: number
  ): Promise<boolean> {
    try {
      console.log('TICKET_VERIFICATION: Verifying ticket for event', eventId);
      console.log('TICKET_VERIFICATION: User address:', userAddress);
      console.log('TICKET_VERIFICATION: TicketKiosk address:', ticketKioskAddress);

      const contract = this.getTicketKioskContract(ticketKioskAddress);
      
      const hasTicket = await contract.read.hasTicketForEvent([
        userAddress as `0x${string}`,
        BigInt(eventId)
      ]);

      console.log('TICKET_VERIFICATION: User has ticket:', hasTicket);
      return hasTicket;

    } catch (error) {
      console.error('TICKET_VERIFICATION: Error verifying ticket:', error);
      return false;
    }
  }

  /**
   * Get all tickets owned by a user for a specific event
   */
  async getUserTicketsForEvent(
    ticketKioskAddress: string,
    userAddress: string
  ): Promise<number[]> {
    try {
      console.log('TICKET_VERIFICATION: Getting user tickets');
      
      const contract = this.getTicketKioskContract(ticketKioskAddress);
      
      const ticketIds = await contract.read.getUserTickets([
        userAddress as `0x${string}`
      ]);

      // Convert BigInt array to number array
      const tickets = ticketIds.map((id: bigint) => Number(id));
      
      console.log('TICKET_VERIFICATION: User tickets:', tickets);
      return tickets;

    } catch (error) {
      console.error('TICKET_VERIFICATION: Error getting user tickets:', error);
      return [];
    }
  }

  /**
   * Get detailed information about a specific ticket
   */
  async getTicketInfo(
    ticketKioskAddress: string,
    ticketId: number
  ): Promise<TicketInfo | null> {
    try {
      console.log('TICKET_VERIFICATION: Getting ticket info for ID:', ticketId);
      
      const contract = this.getTicketKioskContract(ticketKioskAddress);
      
      const ticketInfo = await contract.read.getTicketInfo([BigInt(ticketId)]);
      
      return {
        ticketId,
        eventId: Number(ticketInfo[0]),
        owner: ticketInfo[1],
        originalOwner: ticketInfo[2],
        purchasePrice: ticketInfo[3].toString(),
        purchaseTimestamp: Number(ticketInfo[4]),
        name: ticketInfo[5],
        artCategory: ticketInfo[6],
        metadataURI: ticketInfo[7]
      };

    } catch (error) {
      console.error('TICKET_VERIFICATION: Error getting ticket info:', error);
      return null;
    }
  }

  /**
   * Get event sales information
   */
  async getEventSalesInfo(ticketKioskAddress: string): Promise<EventSalesInfo | null> {
    try {
      console.log('TICKET_VERIFICATION: Getting event sales info');
      
      const contract = this.getTicketKioskContract(ticketKioskAddress);
      
      const salesInfo = await contract.read.getSalesInfo();
      
      return {
        totalTickets: Number(salesInfo[0]),
        soldTickets: Number(salesInfo[1]),
        remainingTickets: Number(salesInfo[2]),
        price: salesInfo[3].toString(),
        artCategory: salesInfo[4]
      };

    } catch (error) {
      console.error('TICKET_VERIFICATION: Error getting sales info:', error);
      return null;
    }
  }

  /**
   * Check if tickets are still available for purchase
   */
  async areTicketsAvailable(ticketKioskAddress: string): Promise<boolean> {
    try {
      const contract = this.getTicketKioskContract(ticketKioskAddress);
      return await contract.read.isAvailable();
    } catch (error) {
      console.error('TICKET_VERIFICATION: Error checking availability:', error);
      return false;
    }
  }

  /**
   * Get event basic information from TicketKiosk
   */
  async getEventBasicInfo(ticketKioskAddress: string): Promise<{
    eventId: number;
    creator: string;
    ticketPrice: string;
    artCategory: string;
  } | null> {
    try {
      const contract = this.getTicketKioskContract(ticketKioskAddress);
      
      const [eventId, creator, ticketPrice, artCategory] = await Promise.all([
        contract.read.eventId(),
        contract.read.creator(),
        contract.read.ticketPrice(),
        contract.read.artCategory()
      ]);

      return {
        eventId: Number(eventId),
        creator,
        ticketPrice: ticketPrice.toString(),
        artCategory
      };

    } catch (error) {
      console.error('TICKET_VERIFICATION: Error getting event basic info:', error);
      return null;
    }
  }

  /**
   * Comprehensive ticket verification for event room access
   */
  async verifyEventAccess(
    ticketKioskAddress: string,
    userAddress: string,
    eventId: number
  ): Promise<{
    hasAccess: boolean;
    userTickets: number[];
    eventInfo: any;
    reason?: string;
  }> {
    try {
      console.log('TICKET_VERIFICATION: Starting comprehensive event access verification');
      console.log('TICKET_VERIFICATION: Event ID:', eventId);
      console.log('TICKET_VERIFICATION: User:', userAddress);

      // Check if user has a ticket for this specific event
      const hasTicket = await this.verifyTicketForEvent(
        ticketKioskAddress,
        userAddress,
        eventId
      );

      if (!hasTicket) {
        return {
          hasAccess: false,
          userTickets: [],
          eventInfo: null,
          reason: 'No valid ticket found for this event'
        };
      }

      // Get user's tickets
      const userTickets = await this.getUserTicketsForEvent(
        ticketKioskAddress,
        userAddress
      );

      // Get event information
      const eventInfo = await this.getEventBasicInfo(ticketKioskAddress);

      console.log('TICKET_VERIFICATION: Access verification completed successfully');
      
      return {
        hasAccess: true,
        userTickets,
        eventInfo,
        reason: 'Valid ticket verified'
      };

    } catch (error) {
      console.error('TICKET_VERIFICATION: Error during access verification:', error);
      return {
        hasAccess: false,
        userTickets: [],
        eventInfo: null,
        reason: 'Verification failed due to technical error'
      };
    }
  }

  /**
   * Monitor ticket verification status for real-time updates
   */
  async monitorTicketStatus(
    ticketKioskAddress: string,
    userAddress: string,
    eventId: number,
    onStatusChange: (status: { hasAccess: boolean; reason: string }) => void
  ): Promise<() => void> {
    console.log('TICKET_VERIFICATION: Starting ticket status monitoring');

    const checkStatus = async () => {
      try {
        const verification = await this.verifyEventAccess(
          ticketKioskAddress,
          userAddress,
          eventId
        );

        onStatusChange({
          hasAccess: verification.hasAccess,
          reason: verification.reason || 'Unknown status'
        });

      } catch (error) {
        console.error('TICKET_VERIFICATION: Error during status monitoring:', error);
        onStatusChange({
          hasAccess: false,
          reason: 'Monitoring failed'
        });
      }
    };

    // Initial check
    await checkStatus();

    // Set up periodic checks (every 30 seconds)
    const interval = setInterval(checkStatus, 30000);

    // Return cleanup function
    return () => {
      clearInterval(interval);
      console.log('TICKET_VERIFICATION: Stopped ticket status monitoring');
    };
  }
}

// Helper function to create ticket verification service
export const createTicketVerificationService = (walletClient: WalletClient) => {
  return new TicketVerificationService(walletClient);
};

// Export the service class
export { TicketVerificationService }; 