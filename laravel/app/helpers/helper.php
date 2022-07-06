<?php
namespace App\helpers;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Config;
use Mail;
use DB;
use App\Models\Order;
use App\Models\Appointment;
use App\Models\PackageCategory;
use App\Models\Cart;
use App\Models\Booking;
use DateTime;

class helper{

    public static function encrypt($string) {
        $output = false;
        $encrypt_method = "AES-256-CBC";
        //pls set your unique hashing key
        // hash
        $key = hash('sha256', config('app.SECRET_KEY'));
        // iv - encrypt method AES-256-CBC expects 16 bytes - else you will get a warning
        $iv = substr(hash('sha256', config('app.SECRET_KEY')), 0, 16);
        $output = openssl_encrypt($string, $encrypt_method, $key, 0, $iv);
        $output = base64_encode($output);
        return $output;
    }
    
    public static function decrypt($string){
        $output = false;
        $encrypt_method = "AES-256-CBC";
        //pls set your unique hashing key
        $secret_key = config('app.SECRET_KEY');
        $secret_iv = config('app.SECRET_KEY');
        // hash
        $key = hash('sha256', $secret_key);
        // iv - encrypt method AES-256-CBC expects 16 bytes - else you will get a warning
        $iv = substr(hash('sha256', $secret_iv), 0, 16);
        $output = openssl_decrypt(base64_decode($string), $encrypt_method, $key, 0, $iv);
        // echo $output;die;
        return $output;
    }
    
    public static function imageNameBeautify($image_name){
        $file = $image_name->getClientOriginalName();
        $filename = pathinfo($file, PATHINFO_FILENAME);
        $filename =  preg_replace( '/[^a-z0-9]+/', '-', strtolower( $filename ) );
        $extension = pathinfo($file, PATHINFO_EXTENSION);
        return $filename.'-'.time().'.'.strtolower($extension);
    }   

    /**
     *
     * Send Mail By Common Function
     *
    */
    public static function SendEmail($mail_param){

        if(isset($mail_param['toEmail']) && $mail_param['toEmail'] != ""){
            //echo "<pre>"; print_r($mail_param); exit();
            $toEmail = $mail_param['toEmail'];
            $ccEmail = isset($mail_param['ccEmail']) ? $mail_param['ccEmail'] : [];
            $bccEmail = isset($mail_param['bccEmail']) ? $mail_param['bccEmail'] : [];
            $subject = isset($mail_param['subject']) ? $mail_param['subject'] : "";
            $mailContent = isset($mail_param['mailContent']) ? $mail_param['mailContent'] : [];
            $emailAttachment = isset($mail_param['emailAttachment']) ? $mail_param['emailAttachment'] : [];
            $emailTemplate = isset($mail_param['emailTemplate']) ? $mail_param['emailTemplate'] : '';
            $file_name = isset($mail_param['emailAttachment']['file_name']) ? $mail_param['emailAttachment']['file_name'] : [];
            $mime = isset($mail_param['emailTemplate']['mime']) ? $mail_param['emailTemplate']['mime'] : '';
            $emailSend = Mail::send(['html' => 'emails.'.$emailTemplate],$mailContent,function($message) use($toEmail, $ccEmail, $bccEmail, $subject, $mailContent, $emailAttachment, $file_name, $mime){
                $message->subject($subject);
                $message->to($toEmail);
                $message->from(config('mail.from.address'), config('mail.from.name'));
                if(isset($emailAttachment) && !empty($emailAttachment)) {
                    $message->attach(
                        $emailAttachment['file_path'],array(
                            'as'=>$file_name,
                            'mime'=>$mime
                        )
                    );
                   // $message->attach($emailAttachment);
                }
            });

            if( count(Mail::failures()) > 0 ) {
                return false;

            } else {
                return true;
            }

        }
        //return true;
    }

    /**
     *
     * Ranndom string
     *
    */
    public static function Random_string(){
        $string = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*';
        return $rand_str = substr(str_shuffle(str_repeat($string, 5)), 0, $length=8);
    }

    public static function getCustomerId(){

        $customerId = Order::pluck('customerno')->last();

        if(!empty($customerId))
        {
            $string = str_split($customerId,5);
        }else{
            //$customerId = 'FMCX550999';
            $customerId = 'ALTUS100001';
            $string = str_split($customerId,5);
        }
        $increment = (int)$string[1] + 1;

        //$code = 'FMCX550'.$increment;
        $code = 'ALTUS'.$increment;
        //echo $code;die;
        return $code;

    }

    public static function dateformat($date){
        $date = DateTime::createFromFormat("m-d-Y" , $date);
        $formated_date = $date->format('Y-m-d');
        return $formated_date;
    }

    public static function order_no()
    {
        $digits = 6;
       return $order_no =  str_pad(rand(0, pow(10, $digits)-1), $digits, '0', STR_PAD_LEFT);
    }

    public static function deleteOrder($orderid)
    {
        $orderdata = Order::where('id',$orderid)->first();        
        DB::table($orderdata->kittype)->where('id',$orderdata->kit_id)->delete();
        Appointment::where('order_id',$orderid)->delete();
        Order::where('id',$orderid)->delete();
    }
    public static function patient_certificate($id)
    {
        $orderdata = Order::where('id',$id)->first();
        $details = array();
        $details['name'] = $orderdata->fname . ' ' .$orderdata->lname;
        $details['email'] = $orderdata->email;
        $details['filePath'] = $orderdata->test_certificate;
        dispatch(new \App\Jobs\PatientcertificateJob($details));
    }
    public static function booking_certificate($id)
    {
        $booking_data = Booking::where('id',$id)->first();
        $details = array();
        $details['name'] = $booking_data->name;
        $details['email'] = $booking_data->email;
        $details['filePath'] = $booking_data->result_file;
        dispatch(new \App\Jobs\BookingcertificateJob($details));
    }
    public static function payment()
    {
        $name = Auth::user()->name;
        $email = Auth::user()->email;
        $details = array();
        $details['name'] = $name;
        $details['email'] = $email;
        dispatch(new \App\Jobs\PaymentJob($details));
    }

    public static function cleanString($string)
    {
       $string = str_replace(' ', '-', $string); // Replaces all spaces with hyphens.
       $string = preg_replace('/[^A-Za-z0-9\-]/', '', $string); // Removes special chars.
       return strtolower($string); // Convert a string into lowercase.
    }

    public static function packageCategory()
    {
        return PackageCategory::select('id', 'name')->get();
    }

    public static function cartCount()
    {
        $userId = Auth::user()->id;
        return Cart::where('user_id', $userId)->count();
    }

    public static function appointmentTime()
    {
        return $appointmentTime = ["09:00 AM","09:15 AM","09:30 AM","09:45 AM","10:00 AM","10:15 AM","10:30 AM","10:45 AM","11:00 AM","11:15 AM","11:30 AM","11:45 AM","01:00 PM","01:15 PM","01:30 PM","01:45 PM","02:00 PM","02:15 PM","02:30 PM","02:45 PM","03:00 PM","03:15 PM","03:30 PM","03:45 PM","04:00 PM","04:15 PM","04:30 PM"];
        // return $appointmentTime = ["11:00 AM", "11:45 AM"];
        
    }

    public static function appointmentDateDesabeled()
    {
        // $appointmentTime = helper::appointmentTime();
        $appointmentTime = ["09:00 AM","09:15 AM","09:30 AM","09:45 AM","10:00 AM","10:15 AM","10:30 AM","10:45 AM","11:00 AM","11:15 AM","11:30 AM","11:45 AM","01:00 PM","01:15 PM","01:30 PM","01:45 PM","02:00 PM","02:15 PM","02:30 PM","02:45 PM","03:00 PM","03:15 PM","03:30 PM","03:45 PM","04:00 PM","04:15 PM","04:30 PM"];
        // $appointmentTime = ["11:00 AM", "11:45 AM"];
        $app_data = Appointment::select('app_time', 'app_date')->where('is_cart','0')->get()->groupBy(function($val) {
                return $val->app_date;
            })->toArray();
        $bookingData = Booking::select('appointment_time', 'appointment_date')->where('is_cart','0')->get()->groupBy(function($val) {
                return date("m-d-Y", strtotime($val->appointment_date));
            })->toArray();
        $date_data = [];
        $timeArray = [];
        if(isset($app_data)){
            foreach ($app_data as $key => $value) {
                $time = array_column($value,'app_time');
                // $timeArray[$key] = $time;
                foreach ($value as $key => $val) {
                    $timeArray[] = array("time"=>$val['app_time'], "date"=>$val['app_date']);
                }
                // $result=array_diff($appointmentTime,$time);
                // if(count($result) == 0){
                //     $date_data[] = $key;
                // }
            }    
        }
        if(isset($bookingData)){
            foreach ($bookingData as $key => $value) {
                $time = array_column($value,'appointment_time');
                foreach ($value as $key => $val) {
                    $timeArray[] = array("time"=>$val['appointment_time'], "date"=>date("m-d-Y", strtotime($val['appointment_date'])));
                }
            }    
        }
        $resultArray = [];
        foreach ($timeArray as $key => $test) {
            $resultArray[$test['date']][] = $test['time'];
        }
        foreach ($resultArray as $key => $result_data) {
            $result=array_diff($appointmentTime,$result_data);
            if(count($result) == 0){
                $date_data[] = $key;
            }
        }
        $data = json_encode($date_data);

        return $data;        
    }
}
?>