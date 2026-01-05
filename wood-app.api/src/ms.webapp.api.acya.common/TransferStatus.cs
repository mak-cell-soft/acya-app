using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.common
{
  public enum TransferStatus
  {
    Pending = 1,
    Confirmed = 2,
    Rejected = 3,
    Cancelled = 4,
    Delivered = 5,
    Failed = 6
  }
}
